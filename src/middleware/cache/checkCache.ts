import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { redisConnection } from '../../redis/connection';
import geoip from 'geoip-lite';

export const checkCacheCompany= async(req : Request , res: Response , next: NextFunction)=>{
    try {
        const redis =  await redisConnection();
        const {id} = req.params;
        const cacheCompanyData = await redis.get(`company:${id}`);

        if(cacheCompanyData){
            res.json({
                message:"Cached Company",
                companies : JSON.parse(cacheCompanyData)
            });
        }else{
            next()
        }
    } catch (error: any ) {
        console.error(error); 
        res.status(500).json(error);
    }
}

export const checkCacheProfile = async( req: Request | any , res: Response, next: NextFunction)=>{
    try {

        const redis =  await redisConnection();
        const ip = req.ip;
        const {_id} = req.decoded;
        const location = geoip.lookup(ip);
        const cacheProfile = await redis.get(`Profile:${_id}`);
        if(cacheProfile){
            res.json({
                message: "Cached Profile",
                user: JSON.parse(cacheProfile),
                location:location 
            }); 
        }else{
            next()
        }
    } catch (error: any )  {  
        console.error(error);
        
        res.status(500).json(error);
    }
}



export const checkCacheVent = async (req: Request, res: Response , next: NextFunction)=>{
    try {
        const redis =  await redisConnection();

        const {id} = req.params;
        const cacheVentData = await redis.get(`vent:${id}`);

        if(cacheVentData){
            res.json({
                message:"Cached Vent",
                vent : JSON.parse(cacheVentData)
            });
        }else{
            next()
        }
        
    } catch (error : any ) {
        console.error(error  );
        res.status(500).json(error)
    } 
}

