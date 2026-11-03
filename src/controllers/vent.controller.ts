import {Request , Response } from 'express';
import { prisma } from "../index";
import { v2 as cloudinary } from 'cloudinary';
import { forViewerComment, forViewerVent } from '../utils/publicView';
import { findBlockingPrivacyIssues } from '../utils/privacyCheck';
import { sanitizeImage } from '../utils/sanitizeImage';
import { open, readFile } from 'fs/promises';
import { parseSkip } from '../utils/pagination';
import { Prisma } from '@prisma/client';
import { rankForYou } from '../utils/forYou';
import geoip from 'geoip-lite';
import { isVentTopic } from '../utils/ventTopics';


export const getVentsCount = async (req: Request , res: Response)=>{
    const lastId = Number(req.query.lastId);
    if (!Number.isInteger(lastId) || lastId < 0) {
        return res.status(400).json({ message: 'A valid lastId is required.' });
    }
    try {
        const count_vents = await prisma.vent.count({
            where: { id: { gt: lastId } }
        });
        res.status(200).json({
            message: "Get Vents Count Successful",
            count_vents: count_vents,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const getAllVents = async (req: Request | any , res : Response )=>{

    const {category , company_id, location_id, skip , author_id, sort, period} = req.query;
    const viewerId = Number(req.decoded._id);
    if (author_id && Number(author_id) !== viewerId) {
        return res.status(403).json({ message: 'You can only view your own posts by author.' });
    }
    if (location_id && (!company_id || !Number.isInteger(Number(location_id)) || Number(location_id) <= 0)) {
        return res.status(400).json({ message: 'A valid company and location are required.' });
    }
    try {
        const where: Prisma.VentWhereInput = {
            ...(company_id ? { company_id: Number(company_id) } : {}),
            ...(location_id ? { location_id: Number(location_id) } : {}),
            ...(category ? { category: String(category) } : {}),
            ...(author_id ? { author_id: Number(author_id) } : {}),
        };
        const include = {
        votes: { where: { user_id: viewerId } },
        company: {
            select: { 
                name: true,
                country: true,
            },
        },
        location: { select: { id: true, city: true, country: true } },
        _count: {
            select: { comments: true },
        },
        author:{
            select:{
                username: true
            }
        },
        Media:true
        } satisfies Prisma.VentInclude;

        const feedSort = sort === 'top' || sort === 'hot' || sort === 'for-you' ? sort : 'new';
        let vents;
        if (feedSort === 'for-you') {
            const ipLocation = geoip.lookup(req.ip ?? '');
            const [latitude, longitude] = ipLocation?.ll ?? [];
            const area = ipLocation?.country && /^[A-Z]{2}$/.test(ipLocation.country)
                ? { country: ipLocation.country, ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {}) }
                : undefined;
            const [companyFollows, topicFollows, candidates] = await Promise.all([
                prisma.companyFollow.findMany({ where: { userId: viewerId }, select: { companyId: true } }),
                prisma.topicFollow.findMany({ where: { userId: viewerId }, select: { topic: true } }),
                prisma.vent.findMany({ where, take: 500, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    select: { id: true, company_id: true, category: true, createdAt: true, upvote: true, downvote: true,
                        company: { select: { type: true, country: true, isRemote: true, mapLat: true, mapLng: true } },
                        location: { select: { country: true } },
                        _count: { select: { comments: true, reports: { where: { status: 'PENDING' } } } } } }),
            ]);
            const ids = rankForYou(candidates as unknown as Parameters<typeof rankForYou>[0], new Set(companyFollows.map(item => item.companyId)), new Set(topicFollows.map(item => item.topic)), Date.now(), area)
                .slice(parseSkip(skip), parseSkip(skip) + 10);
            const rows = ids.length ? await prisma.vent.findMany({ where: { id: { in: ids } }, include }) : [];
            const byId = new Map(rows.map(row => [row.id, row]));
            vents = ids.flatMap(id => { const vent = byId.get(id); return vent ? [vent] : []; });
        } else if (feedSort === 'new') {
            vents = await prisma.vent.findMany({
                where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: parseSkip(skip), take: 10,
            });
        } else {
            const conditions = [Prisma.sql`TRUE`];
            if (company_id) conditions.push(Prisma.sql`v.company_id = ${Number(company_id)}`);
            if (location_id) conditions.push(Prisma.sql`v.location_id = ${Number(location_id)}`);
            if (category) conditions.push(Prisma.sql`v.category = ${String(category)}`);
            if (author_id) conditions.push(Prisma.sql`v.author_id = ${Number(author_id)}`);
            if (feedSort === 'top') {
                const days = period === 'today' ? 1 : period === 'month' ? 30 : period === 'all' ? null : 7;
                if (days) conditions.push(Prisma.sql`v."createdAt" >= ${new Date(Date.now() - days * 24 * 60 * 60 * 1000)}`);
            }
            const ranking = feedSort === 'top'
                ? Prisma.sql`(v.upvote - v.downvote) DESC, v.upvote DESC, v."createdAt" DESC, v.id DESC`
                : Prisma.sql`(v.upvote - v.downvote + 1.0) / POWER(EXTRACT(EPOCH FROM (NOW() - v."createdAt")) / 3600.0 + 2.0, 1.5) DESC, v."createdAt" DESC, v.id DESC`;
            const ranked = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
                SELECT v.id FROM "Vent" v
                WHERE ${Prisma.join(conditions, ' AND ')}
                ORDER BY ${ranking}
                LIMIT ${10} OFFSET ${parseSkip(skip)}
            `);
            const ids = ranked.map(row => row.id);
            const rows = ids.length ? await prisma.vent.findMany({ where: { id: { in: ids } }, include }) : [];
            const byId = new Map(rows.map(row => [row.id, row]));
            vents = ids.flatMap(id => { const vent = byId.get(id); return vent ? [vent] : []; });
        }

        res.status(200).json({
            message: "Get Vents Successful",
            vents: vents.map(vent => forViewerVent(vent, viewerId)),
        })
    } catch (error : any ) {
        console.error(error );
        res.status(500).json(error);
    }

}

export const getAllTrendingVents = async(req:Request | any , res: Response)=>{
    try {
        const viewerId = Number(req.decoded._id);
        const { skip } = req.query;
        const vents = await prisma.vent.findMany({
        where: {
            createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            }
        },
    include: {
        votes: { where: { user_id: viewerId } },
            company: {
                select: {
                    name: true,
                    country: true,
                },
            },
            location: { select: { id: true, city: true, country: true } },
            _count: {
                select: {  comments: true },
            },
            author:{
                select:{
                    username: true
                }
            },
            Media:true
        },
        orderBy: [
            { upvote: 'desc' },      
            { createdAt: 'desc' }    
        ],
        take: 10,
        skip: parseSkip(skip)
    });

    res.status(200).json({
            message: "Get Trending Vents Successful",
            vents: vents.map(vent => forViewerVent(vent, viewerId)),
        });

    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error)
    }
}


export const getVent = async (req: Request | any , res : Response )=> {
    const {id } = req.params;
    const viewerId = Number(req.decoded._id);

    try {
        const vent = await prisma.vent.findUnique({
            where: {id : Number(id)},
            include:{
                votes: { where: { user_id: viewerId } },
                _count: {
                    select: { comments: true },
                },
                company: {
                    select: {
                        name: true,
                        country: true,
                        id:true,
                    },
                }, 
                location: { select: { id: true, city: true, country: true } },
                author:{
                    select:{
                        username: true
                    }
                },
                
                    Media:true
                }
        })

        
        res.status(200).json({
            message: "Get Vent successfully",
            vent: vent ? forViewerVent(vent, viewerId) : null
        });
    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error);
    }
    
} 


export const createVent = async (req: Request | any , res : Response )=> {
    const {_id} = req.decoded; 
    const {company_id, location_id, content, category} = req.body;
    if (typeof content !== 'string' || !content.trim() || content.length > 1000 || !Number.isInteger(Number(company_id)) || !isVentTopic(category)) {
        return res.status(400).json({ message: 'A company, valid topic, and post of up to 1000 characters are required.' });
    }
    const privacyIssues = findBlockingPrivacyIssues(content);
    if (privacyIssues.length > 0) {
        return res.status(422).json({ message: 'Remove identifying details before posting.', privacyIssues });
    }

    try {
        let locationId: number | null = null;
        if (location_id != null && location_id !== '') {
            locationId = Number(location_id);
            if (!Number.isInteger(locationId) || locationId <= 0 || !await prisma.companyLocation.findFirst({ where: { id: locationId, companyId: Number(company_id) } })) {
                return res.status(400).json({ message: 'Choose a valid location for this company.' });
            }
        }
        const files = (req.files ?? []) as Express.Multer.File[];
        const videos = files.filter(file => file.mimetype === 'video/mp4');
        if (videos.length && files.length !== 1) {
            return res.status(400).json({ message: 'Attach one video or up to four photos.' });
        }
        for (const file of videos) {
            const handle = await open(file.path, 'r');
            const header = Buffer.alloc(12);
            try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
            if (file.size < 12 || header.toString('ascii', 4, 8) !== 'ftyp') {
                return res.status(400).json({ message: 'Use a valid MP4 video.' });
            }
        }
        if (files.some(file => file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024)) {
            return res.status(400).json({ message: 'Photos must be 5 MB or smaller.' });
        }
        const preparedMedia: Array<{ type: 'IMAGE' | 'VIDEO'; source: string }> = [];
        for (const file of files) {
            if (file.mimetype.startsWith('image/')) {
                let clean: Awaited<ReturnType<typeof sanitizeImage>>;
                try {
                    clean = await sanitizeImage(await readFile(file.path));
                } catch {
                    return res.status(400).json({ message: 'Could not read a photo. Use valid JPEG, PNG, or WebP files.' });
                }
                preparedMedia.push({ type: 'IMAGE', source: `data:${clean.mimeType};base64,${clean.buffer.toString('base64')}` });
            } else {
                preparedMedia.push({ type: 'VIDEO', source: file.path });
            }
        }
        const uploadedMedia: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }> = [];
        for (const item of preparedMedia) {
            const cloud = await cloudinary.uploader.upload(item.source, {
                resource_type: item.type === 'IMAGE' ? 'image' : 'video',
                ...(item.type === 'VIDEO' ? { transformation: { flags: 'force_strip' } } : {}),
            });
            uploadedMedia.push({ type: item.type, url: cloud.secure_url });
        }
        const create_vent = await prisma.vent.create({
                data:{ 
                    company_id: Number(company_id), 
                    location_id: locationId,
                    author_id: _id,
                    no_pii: false,
                    verified_employee:false,
                    showUsername: true,
                    content: content.trim(),
                    category,                    
                    upvote: 0,
                    downvote: 0,
                    ...(uploadedMedia.length ? { Media: { create: uploadedMedia } } : {}),
            }
        });
        try {
            const followers = await prisma.companyFollow.findMany({ where: { companyId: create_vent.company_id, userId: { not: Number(_id) }, user: { notificationPreference: { companyPosts: true } } }, select: { userId: true } });
            if (followers.length) await prisma.notification.createMany({ data: followers.map(({ userId }) => ({ userId, ventId: create_vent.id, kind: 'COMPANY_POST' as const })) });
        } catch (alertError) { console.error('Could not create company post notifications', alertError); }
        const vent = await prisma.vent.findUnique({
            where: {id : Number(create_vent.id)},
            include:{
            votes: { where: { user_id: Number(_id) } },
            _count: {
                select: { comments: true },
            },
            company: {
                select: {
                    name: true,
                    country: true,
                },
            }, 
            location: { select: { id: true, city: true, country: true } },
            author:{
                select:{
                    username: true
                }
            },
                
                Media:true
            }
        })
        res.status(200).json({
            message: "Add Vent Successful",
            vent: vent ? forViewerVent(vent, Number(_id)) : null,
        });

    } catch (error : any ) {
        console.error(error)
        res.status(500).json({ message: 'Could not publish post.' })
    }
}

export const updateVent = async (req: Request | any , res : Response )=>{

    const { id } = req.params;
    const {_id} = req.decoded;

    const { company_id , content , category } = req.body;
    if (typeof content === 'string') {
        const privacyIssues = findBlockingPrivacyIssues(content);
        if (privacyIssues.length > 0) {
            return res.status(422).json({ message: 'Remove identifying details before saving.', privacyIssues });
        }
    }
    try {
        const update_vent = await prisma.vent.update({
            where: { id : Number(id) , author_id: _id },    
            data:{ 
                company_id: company_id ,
                ...(company_id ? { location_id: null } : {}),
                content: content , 
                category: category 
            }
        });
        res.status(200).json({ 
            message : "Update vent Successfully",
            vent : update_vent
        } );

    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const deleteVent = async (req: Request | any , res : Response )=>{
    const { id } = req.params;
    const {_id} = req.decoded;

    try {
        const delete_vent = await prisma.vent.delete({
            where:{
                id : Number(id),
                author_id: _id
            }
        });
        res.status(200).json({message : "Vent Deleted" , vent : delete_vent});
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const upVote = async (req: Request | any  , res : Response )=>{
    const { id } = req.params;
    const {_id } = req.decoded;

    try {
        const existing_vote = await prisma.vote.findFirst({
            where : {
                user_id: Number(_id),
                vent_id: Number(id),
            }
        });

        if (existing_vote !== null && existing_vote.vote == 'UPVOTE'){
             // CASE 1
            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{upvote : {decrement: 1}}
            });

            const add_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'NOVOTE'
                }
            });
        }else if (existing_vote !== null && existing_vote.vote == 'DOWNVOTE'){
            // CASE 2
            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{upvote : {increment: 1} , downvote : {decrement : 1}}
            });

            const add_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'UPVOTE'
                }
            });

       
        }
        else if (existing_vote !== null && existing_vote.vote == 'NOVOTE' ){
            // CASE 3
            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{ upvote : {increment: 1} }
            });

            const add_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'UPVOTE'
                }
            });
        }
        else{

        const incremet_vote = await prisma.vent.update({
            where:{ id : Number(id) }, 
            data:{upvote : {increment: 1}} 
        });

        const add_vote = await prisma.vote.create({
            data:{
                vent_id: incremet_vote.id, 
                user_id: _id,
                vote: 'UPVOTE'
            } 
        });
        
    }

        const currentVote = await prisma.vote.findFirst({
                where: {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                });

        res.status(200).json({
            message : "Successfully Upvote",
            vote : currentVote, 
            author_id : _id
        }); 

    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error)
    }
}

export const downVote = async (req: Request | any , res : Response )=>{
    const { id } = req.params;
    const {_id } = req.decoded;

    try {

        const existing_vote = await prisma.vote.findFirst({
                where: {
                user_id: Number(_id),
                vent_id: Number(id),
            }
        });
        
        
        if (existing_vote !== null && existing_vote.vote =='DOWNVOTE'){

            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{downvote : {decrement: 1}}
            }); 

            const down_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'NOVOTE'
                }
            }); 
        
        }else if (existing_vote !== null && existing_vote.vote == 'UPVOTE'){
            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{downvote : {increment: 1} , upvote: {decrement: 1}}
            });

            const down_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'DOWNVOTE'
                }
            }); 
        
        }
        else if (existing_vote !== null && existing_vote.vote =='NOVOTE'){
            const no_vote = await prisma.vent.update({
                where:{ id : Number(id) },
                data:{downvote : {increment: 1}}
            });

            const down_vote = await prisma.vote.updateMany({
                where : {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
                data:{
                    vote: 'DOWNVOTE'
                }
            }); 
       

        }else{

        const decrement_vote = await prisma.vent.update({
            where:{ id : Number(id) },
            data:{ downvote : {increment: 1}}
        });

        const down_vote = await prisma.vote.create({
            data:{
                vent_id: decrement_vote.id,
                user_id: _id,
                vote: 'DOWNVOTE'
            }
        });
        
    }

        const currentVote = await prisma.vote.findFirst({
                where: {
                    user_id: Number(_id),
                    vent_id: Number(id),
                },
            });

        res.status(200).json({
            message : "Successfully DownVote",
            vote:currentVote,
            author_id : _id
        });

    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error)
    }
} 

export const reportVent = async (req: Request | any  , res : Response )=>{
    const {id } = req.params;
    const {_id} = req.decoded;
    const {report , category} = req.body;
    try {
    const add_report = await prisma.reports.create({
            data:{
                vent_id: Number(id),
                reporter_id: _id,
                report,
                category
            }
        });
        res.status(200).json({
            message : "Report Add Successfull",
            report : add_report
        });
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error)
    } 

}

export const addComment = async (req: Request  | any , res : Response )=>{

    const{ comment } = req.body;
    const {id} = req.params;
    const {_id} = req.decoded;
    const privacyIssues = findBlockingPrivacyIssues(comment);
    if (privacyIssues.length > 0) {
        return res.status(422).json({ message: 'Remove identifying details before commenting.', privacyIssues });
    }
    try {
        const add_comment = await prisma.comment.create({
            data:{
                vent_id : Number(id ),
                author_id: _id,
                showUsername: true,
                comment
            }
        });
        try {
            const post = await prisma.vent.findUnique({ where: { id: Number(id) }, select: { author_id: true } });
            if (post && post.author_id !== Number(_id)) {
                const pref = await prisma.notificationPreference.findUnique({ where: { userId: post.author_id } });
                if (pref?.replies) await prisma.notification.create({ data: { userId: post.author_id, ventId: Number(id), kind: 'POST_REPLY' } });
            }
        } catch (alertError) { console.error('Could not create reply notification', alertError); }
        const find_comment = await prisma.comment.findUnique({
            where :{
                id : add_comment.id
            },
            include:{
                subcomments: {
                    select:{
                        id:true,
                        subcomment: true,
                        showUsername: true,
                        createdAt: true,
                        author: {
                            select:{
                                username: true,
                                id:true
                            }
                        },
                    }
                },
                author:{
                    select:{
                        username: true,
                    }
                }
            },
        });
        res.status(200).json({
            message : "Add Comment Successfull",
            comment : find_comment ? forViewerComment(find_comment, Number(_id)) : null
        });

    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error)
    }

}

export const getAllComment = async (req: Request | any , res : Response )=>{
    const { id } = req.params;
    const {skip} = req.query;
    const viewerId = Number(req.decoded._id);
    try {
        const comments = await prisma.comment.findMany({
            where: {vent_id : Number(id)},
            include:{
                subcomments: {
                    select:{
                        id:true,
                        subcomment: true,
                        showUsername: true,
                        createdAt: true,
                        author: {
                            select:{
                                id:true,
                                username: true
                            }
                        },
                    }
                },
                author:{
                    select:{
                        id:true,
                        username: true,
                    }
                }
            },
            orderBy: [ 
                {
                    createdAt: 'desc' 

                },
            ],
            skip: parseSkip(skip),
            take: 10
        });

        res.status(200).json({
            message: "Get Comments Successfull",
            comments: comments.map(comment => forViewerComment(comment, viewerId))
        });

    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error);
    }

}
