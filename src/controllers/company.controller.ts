import {Request , Response } from 'express';
import { companyBloomfilter, prisma } from "../index";
import { redisConnection } from '../redis/connection';
import geoip from 'geoip-lite';
import { format } from 'path';
import { count } from 'console';


export const getCompaniesCount = async (req: Request , res: Response)=>{
    const { lastcreatedAt } = req.query;
    try {
        const count_companies = await prisma.company.count({
            where: { 
                createdAt : {
                    gte: String(lastcreatedAt)
                }
            }
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

export const getAllCompanies = async (req: Request | any, res : Response )=>{

    const { industry , company_name, skip , place , searchcountry} = req.query;
    const ip = req.ip; 
    const location = geoip.lookup(ip);
    const country = location?.country; 
    try {

    const companies = await prisma.company.findMany({
        where : { 
            ...( company_name ? {
                    name: {
                        contains: String(company_name),
                        mode: 'insensitive'
                    } 
                } :{}),
            ...( industry ?  { 
                industry: String(industry)
            } :{}),
            ...( searchcountry ?  { 
                country: String(searchcountry)
            } :{}),
            ...( place ?  { 
                city: String(place)
            } :{}),
        }, 
        include:{
            _count:{
                select:{vents: true}
            }
        },
        orderBy: [
                {
                    _relevance: {
                        fields: ['country'],
                        search: String(country),
                        sort: 'desc',
                    },
                },
                {
                    vents: {
                        _count: 'desc' 
                    }
                } 
            ],
            skip: Number(skip),
            take: 10
        });

    res.status(200).json({
        message: "Get Companies Successfull",
        companies : companies
    });
    } catch (error :any ) {
        console.error(error);
        res.status(500).json(error)
    }

}

export const getCompany = async (req: Request , res : Response )=>{
    const{id} = req.params;
    const redis = await redisConnection();
    
    try {
    const company = await prisma.company.findUnique({
        where:{id : Number(id)},
        include:{
            _count:{
                select:{vents: true}
            }
        },
    });
    await redis.set(`company:${id}`, JSON.stringify(company));
    await redis.expire(`company:${id}` , 3600);
    res.status(200).json({
        message: "Get Company Successfull",
        company:company
    });
} catch (error : any ) { 
    console.error(error); 
    res.status(500).json(error);
}

}

export const createCompany = async (req: Request , res : Response )=>{
    const redis = await redisConnection();
    const { 
        name , 
        domain ,  
        industry ,
        city , 
        country,
    } = req.body;
    
    try {


        const existing_company = companyBloomfilter.has(`${domain}${name}${industry}`);
        
        if(existing_company == true ){
            res.status(409).json({  
                message: "Company already exist"
            })
        }

        const add_company = await prisma.company.create({
            data:{
                name,
                domain,
                industry,
                city,
                country,
            }
        });

        const company = await prisma.company.findUnique({
            where:{id : Number(add_company.id)},
            include:{
                _count:{
                    select:{vents: true}
                }
            },
        });
        await redis.set(`company:${company?.id}`, JSON.stringify(company));
        await redis.expire(`company:${company?.id}` , 3600);
        companyBloomfilter.add(`${domain}${name}${industry}`)
        res.status(201).json({
            message: "Add Company Successfull",
            company : company
        })
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }

}
