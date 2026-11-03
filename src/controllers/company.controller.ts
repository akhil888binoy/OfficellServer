import {Request , Response } from 'express';
import { prisma } from "../index";
import geoip from 'geoip-lite';
import { publicCompany, weekStartUTC } from '../utils/publicView';
import { parseSkip } from '../utils/pagination';
import { geocodeCompany } from '../utils/geocodeCompany';
import { geocodeCountry } from '../utils/geocodeCountry';
import { geocodeRegion } from '../utils/geocodeRegion';
import { findCompanyLocations, reverseCompanyLocation } from '../utils/companyLocation';
import { Prisma } from '@prisma/client';
import { findBlockingPrivacyIssues } from '../utils/privacyCheck';
import { fetchCompanyLogo } from '../utils/companyLogo';

const distanceKm = (latA: number, lngA: number, latB: number, lngB: number) => {
    const toRadians = Math.PI / 180;
    const dLat = (latB - latA) * toRadians;
    const dLng = (lngB - lngA) * toRadians;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(latA * toRadians) * Math.cos(latB * toRadians) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getCompaniesCount = async (req: Request , res: Response)=>{
    const lastId = Number(req.query.lastId);
    if (!Number.isInteger(lastId) || lastId < 0) {
        return res.status(400).json({ message: 'A valid lastId is required.' });
    }
    try {
        const count_companies = await prisma.company.count({
            where: { id: { gt: lastId } }
        });
        res.status(200).json({
            message: "Get Companies Count Successful",
            count_companies: count_companies,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const getAllCompanies = async (req: Request, res : Response )=>{

    const { industry, company_name, skip, place, searchcountry, region, type, sort, nearby } = req.query;
    const nearbyOnly = nearby === '1';
    const selectedType = type === 'LOCAL' || type === 'MNC' ? type : undefined;
    const selectedSort = sort === 'newest' || sort === 'name' || sort === 'most-stories' ? sort : 'recent-activity';
    const selectedCountry = typeof searchcountry === 'string' && /^[A-Za-z]{2}$/.test(searchcountry) ? searchcountry.toUpperCase() : undefined;
    const selectedRegion = typeof region === 'string' && region.trim().length <= 120 ? region.trim() : undefined;
    try {

    const ipLocation = nearbyOnly && !selectedCountry ? geoip.lookup(req.ip ?? '') : null;
    const detectedCountry = ipLocation?.country && /^[A-Z]{2}$/.test(ipLocation.country) ? ipLocation.country : null;
    const [latitude = 0, longitude = 0] = ipLocation?.ll ?? [];
    const hasDetectedLocation = Boolean(detectedCountry && ipLocation?.city && Number.isFinite(latitude) && Number.isFinite(longitude));
    const manualArea = Boolean(selectedCountry && (selectedRegion || selectedType === 'MNC'));
    if (nearbyOnly && !manualArea && !hasDetectedLocation) {
        return res.status(200).json({ message: 'Choose a country and region to find nearby companies.', companies: [], hasMore: false, needsArea: true });
    }

    const areaCountry = manualArea ? selectedCountry! : detectedCountry!;
    const radiusKm = 500;

    const companies = await prisma.company.findMany({
        where : { 
            ...( company_name ? {
                    name: {
                        contains: String(company_name),
                        mode: 'insensitive'
                    } 
                } :{}),
            ...(industry ? String(industry) === 'MNCs' ? { type: 'MNC' as const } : { industry: String(industry) } : {}),
            ...(selectedType ? { type: selectedType } : {}),
            ...(nearbyOnly ? { OR: [{ country: areaCountry }, { type: 'MNC', locations: { some: { country: areaCountry } } }] } : selectedCountry ? { OR: [{ country: selectedCountry }, { locations: { some: { country: selectedCountry } } }] } : {}),
            ...(!nearbyOnly && selectedRegion ? { region: { equals: selectedRegion, mode: 'insensitive' as const } } : {}),
            ...( place ?  { 
                city: String(place)
            } :{}),
        }, 
        include:{
            _count:{
                select:{vents: true, locations: true}
            }
        },
        orderBy: [{ id: 'desc' }],
        }) as unknown as Array<Prisma.CompanyGetPayload<{ include: { _count: true } }>>;

    const activity = (companies.length ? await prisma.vent.groupBy({
        by: ['company_id'],
        where: { company_id: { in: companies.map(company => company.id) } },
        _max: { createdAt: true },
    }) : []) as Array<{ company_id: number; _max: { createdAt: Date | null } }>;
    const latestStoryByCompany = new Map(activity.map(item => [item.company_id, item._max.createdAt]));
    const isNearby = (company: typeof companies[number]) => {
        if (!nearbyOnly || company.type === 'MNC' || company.isRemote) return true;
        if (manualArea) return company.region?.toLocaleLowerCase() === selectedRegion?.toLocaleLowerCase();
        return company.mapLat != null && company.mapLng != null && distanceKm(latitude, longitude, company.mapLat, company.mapLng) <= radiusKm;
    };
    const ranked = companies.map(company => ({ company, discoveryScope: isNearby(company) ? 'nearby' as const : 'same-country' as const }));
    ranked.sort((left, right) => {
        if (nearbyOnly && left.discoveryScope !== right.discoveryScope) return left.discoveryScope === 'nearby' ? -1 : 1;
        const a = left.company;
        const b = right.company;
        if (selectedSort === 'name') return a.name.localeCompare(b.name) || a.id - b.id;
        if (selectedSort === 'newest') return b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id;
        if (selectedSort === 'most-stories') return b._count.vents - a._count.vents || b.id - a.id;
        const lastA = latestStoryByCompany.get(a.id)?.getTime() ?? 0;
        const lastB = latestStoryByCompany.get(b.id)?.getTime() ?? 0;
        return lastB - lastA || b._count.vents - a._count.vents || b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id;
    });
    const start = parseSkip(skip);
    const page = ranked.slice(start, start + 10);

    res.status(200).json({
        message: "Get Companies Successfull",
        companies: page.map(({ company, discoveryScope }) => ({
            ...company,
            createdAt: weekStartUTC(company.createdAt),
            updatedAt: undefined,
            discoveryScope: nearbyOnly ? discoveryScope : undefined,
            latestStoryWeek: latestStoryByCompany.get(company.id) ? weekStartUTC(latestStoryByCompany.get(company.id)!) : null,
        })),
        ...(nearbyOnly ? { hasMore: ranked.length > start + 10, needsArea: false, nearbyLabel: manualArea ? selectedRegion || areaCountry : ipLocation?.city, nearbyCountry: areaCountry } : {}),
    });
    } catch (error :any ) {
        console.error(error);
        res.status(500).json(error)
    }

}

export const getMapCompanies = async (req: Request, res: Response) => {
    const { company_name, industry, place, searchcountry } = req.query;
    const where: Prisma.CompanyWhereInput = {
        ...(company_name ? { name: { contains: String(company_name), mode: 'insensitive' } } : {}),
        ...(industry ? String(industry) === 'MNCs' ? { type: 'MNC' as const } : { industry: String(industry) } : {}),
        ...(place ? { city: String(place) } : {}),
        ...(searchcountry ? { OR: [{ country: String(searchcountry) }, { locations: { some: { country: String(searchcountry) } } }] } : {}),
    };
    try {
        const companies = await prisma.company.findMany({
            where,
            select: {
                id: true, name: true, type: true, domain: true, description: true, isRemote: true, industry: true, city: true, region: true, country: true,
                mapLat: true, mapLng: true, locations: true, _count: { select: { vents: true } },
            },
            orderBy: { name: 'asc' },
        });
        const key = process.env.MAPTILER_API_KEY?.trim();
        const mapCompanies = companies.flatMap(({ locations, ...company }) =>
            locations.length
                ? locations.map(location => ({
                    ...company,
                    city: location.city,
                    country: location.country,
                    mapLat: location.mapLat,
                    mapLng: location.mapLng,
                    locationId: location.id,
                    locationCount: locations.length,
                }))
                : [{ ...company, locationCount: company.mapLat != null && company.mapLng != null ? 1 : 0 }]
        );
        res.status(200).json({
            companies: mapCompanies,
            mapStyleUrl: key ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(key)}` : null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Could not load company map.' });
    }
};

export const getCompanyMapConfig = (_req: Request, res: Response) => {
    const key = process.env.MAPTILER_API_KEY?.trim();
    res.status(200).json({
        mapStyleUrl: key ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(key)}` : null,
    });
};

export const searchCompanyLocations = async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim().toUpperCase() : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region.trim() : undefined;
    if (query.length < 2 || query.length > 120) return res.status(400).json({ message: 'Search for a city.' });
    if (country && !/^[A-Z]{2}$/.test(country)) return res.status(400).json({ message: 'Choose a valid country.' });
    if (region && region.length > 120) return res.status(400).json({ message: 'Choose a valid region.' });
    try {
        const locations = await findCompanyLocations(query, country, region);
        res.status(200).json({ locations });
    } catch (error) {
        console.error('Company location search failed:', error);
        res.status(502).json({ message: 'Could not search locations.' });
    }
};

export const reverseCompanyLocationAtPoint = async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'Choose a point on the map.' });
    }
    try {
        const location = await reverseCompanyLocation(lng, lat);
        if (!location) return res.status(404).json({ message: 'No city found here. Try a nearby city or search by name.' });
        res.status(200).json({ location });
    } catch (error) {
        console.error('Company location lookup failed:', error);
        res.status(502).json({ message: 'Could not identify that location.' });
    }
};

export const getCompany = async (req: Request , res : Response )=>{
    const{id} = req.params;
    
    try {
    const company = await prisma.company.findUnique({
        where:{id : Number(id)},
        include:{
            _count:{
                select:{vents: true, locations: true}
            },
            locations: { select: { id: true, city: true, country: true }, orderBy: [{ country: 'asc' }, { city: 'asc' }] },
        },
    });
    res.status(200).json({
        message: "Get Company Successfull",
        company: company ? publicCompany(company) : null
    });
} catch (error : any ) { 
    console.error(error); 
    res.status(500).json(error);
}

}

export const createCompany = async (req: Request , res : Response )=>{
    const {
        name , 
        domain ,  
        description,
        isRemote = false,
        industry ,
        city , 
        region,
        country,
        locations,
        type = 'LOCAL',
    } = req.body;
    
    try {


        const isMnc = type === 'MNC';
        if (isRemote && isMnc) return res.status(400).json({ message: 'Choose a valid company location.' });
        const countryOnly = !isMnc && !isRemote && !city?.trim() && !locations?.length;
        const requestedLocations: Array<{ city?: string; country: string }> = isRemote || countryOnly ? [] : locations?.length ? locations : [{ city, country }];
        if (!isMnc && !isRemote && requestedLocations.some(location => !location.city?.trim())) return res.status(400).json({ message: 'Choose a city for each office.' });
        const uniqueLocations = new Set(requestedLocations.map(location => `${isMnc ? '' : location.city!.trim().toLocaleLowerCase()}|${location.country.trim().toLocaleLowerCase()}`));
        if (uniqueLocations.size !== requestedLocations.length) return res.status(400).json({ message: 'Each office city can only be added once.' });
        const mappedLocations = await Promise.all(requestedLocations.map(async (location, index) => ({
            city: isMnc ? null : location.city!.trim(), country: location.country.trim().toUpperCase(),
            coordinates: isMnc ? await geocodeCountry(location.country) : await geocodeCompany(location.city, location.country, index === 0 ? region : undefined),
        })));
        if (isMnc && mappedLocations.some(location => !location.coordinates)) {
            return res.status(422).json({ message: 'Could not locate one of those countries.' });
        }
        const primaryLocation = mappedLocations[0];
        const normalizedName = name.trim();
        const normalizedDomain = domain?.trim() || null;
        const normalizedDescription = description?.trim() || null;
        const normalizedRegion = region?.trim() || null;
        if (normalizedDescription && findBlockingPrivacyIssues(normalizedDescription).length) {
            return res.status(422).json({ message: 'Remove contact details and exact dates from the company description.' });
        }
        const homeCountry = isRemote || countryOnly ? country.trim().toUpperCase() : null;
        const existing_company = await prisma.company.findFirst({
            where: normalizedDomain
                ? { domain: { equals: normalizedDomain, mode: 'insensitive' } }
                : isRemote ? { name: { equals: normalizedName, mode: 'insensitive' }, isRemote: true, country: homeCountry, description: { equals: normalizedDescription!, mode: 'insensitive' } }
                : countryOnly ? { name: { equals: normalizedName, mode: 'insensitive' }, isRemote: false, country: homeCountry, city: null, region: normalizedRegion, description: { equals: normalizedDescription!, mode: 'insensitive' } }
                : isMnc ? { name: { equals: normalizedName, mode: 'insensitive' }, type: 'MNC', description: { equals: normalizedDescription!, mode: 'insensitive' } } : {
                    name: { equals: normalizedName, mode: 'insensitive' },
                    country: primaryLocation.country,
                    city: primaryLocation.city,
                    region: normalizedRegion,
                    description: { equals: normalizedDescription!, mode: 'insensitive' },
                },
        });
        if (existing_company) {
            return res.status(409).json({ message: 'Company already exists', company: publicCompany(existing_company) });
        }

        const regionCoordinates = countryOnly && normalizedRegion ? await geocodeRegion(normalizedRegion, homeCountry!) : null;
        const add_company = await prisma.company.create({
            data:{
                name: normalizedName,
                type,
                domain: normalizedDomain,
                description: normalizedDescription,
                isRemote,
                industry: industry || null,
                city: isRemote || countryOnly || isMnc ? null : primaryLocation.city,
                region: isRemote || isMnc ? null : normalizedRegion,
                country: isRemote || countryOnly ? homeCountry : isMnc ? null : primaryLocation.country,
                ...(regionCoordinates ?? {}),
                ...(!isRemote && !countryOnly && !isMnc && primaryLocation.coordinates ? primaryLocation.coordinates : {}),
                ...(mappedLocations.some(location => location.coordinates) ? { locations: { create: mappedLocations.filter(location => location.coordinates).map(location => ({ city: location.city, country: location.country, ...location.coordinates! })) } } : {}),
            }
        });

        if (normalizedDomain) {
            const logoUrl = await fetchCompanyLogo(normalizedDomain);
            if (logoUrl) {
                try { await prisma.company.update({ where: { id: add_company.id }, data: { logoUrl } }); }
                catch (logoError) { console.error('Could not save company logo', logoError); }
            }
        }

        const company = await prisma.company.findUnique({
            where:{id : Number(add_company.id)},
            include:{
                _count:{
                    select:{vents: true}
                },
                locations: { select: { id: true, city: true, country: true }, orderBy: [{ country: 'asc' }, { city: 'asc' }] },
            },
        });
        res.status(201).json({
            message: "Add Company Successfull",
            company : company ? publicCompany(company) : null
        })
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }

}

export const addCompanyLocation = async (req: Request, res: Response) => {
    const companyId = Number(req.params.id);
    if (!Number.isInteger(companyId) || companyId <= 0) return res.status(400).json({ message: 'Choose a valid company.' });
    const city = req.body.city?.trim() || null;
    const country = req.body.country.trim().toUpperCase();
    try {
        const company = await prisma.company.findUnique({ where: { id: companyId }, include: { locations: true } });
        if (!company) return res.status(404).json({ message: 'Company not found.' });
        const isMnc = company.type === 'MNC';
        if (!isMnc && !city) return res.status(400).json({ message: 'Choose a city for this office.' });
        if (company.locations.some(location => location.country.toLocaleLowerCase() === country.toLocaleLowerCase() && (isMnc || location.city?.toLocaleLowerCase() === city?.toLocaleLowerCase())) ||
            (!isMnc && company.locations.length === 0 && company.city?.toLocaleLowerCase() === city?.toLocaleLowerCase() && company.country?.toLocaleLowerCase() === country.toLocaleLowerCase())) {
            return res.status(409).json({ message: isMnc ? 'This country is already listed.' : 'This office is already listed.' });
        }
        const coordinates = isMnc ? await geocodeCountry(country) : await geocodeCompany(city, country);
        if (!coordinates) return res.status(422).json({ message: isMnc ? 'Could not locate that country.' : 'Could not locate that city. Choose it again from the map.' });
        await prisma.$transaction(async tx => {
            if (!isMnc && company.locations.length === 0 && company.city && company.country && company.mapLat != null && company.mapLng != null) {
                await tx.companyLocation.create({ data: { companyId, city: company.city, country: company.country, mapLat: company.mapLat, mapLng: company.mapLng } });
            }
            await tx.companyLocation.create({ data: { companyId, city: isMnc ? null : city, country, ...coordinates } });
        });
        const updated = await prisma.company.findUnique({ where: { id: companyId }, include: {
            _count: { select: { vents: true } },
            locations: { select: { id: true, city: true, country: true }, orderBy: [{ country: 'asc' }, { city: 'asc' }] },
        } });
        return res.status(201).json({ message: isMnc ? 'Country added.' : 'Office added.', company: updated ? publicCompany(updated) : null });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'This location is already listed.' });
        console.error(error);
        return res.status(500).json({ message: 'Could not add this office.' });
    }
};
