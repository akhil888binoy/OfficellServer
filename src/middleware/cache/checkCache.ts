import { Request, Response, NextFunction } from 'express';
import { optionalRedisConnection } from '../../redis/connection';
import { getCachedProfile } from '../../redis/profileCache';
import geoip from 'geoip-lite';

export const checkCacheCompany= async(req : Request , res: Response , next: NextFunction)=>{
    try {
        const redis = await optionalRedisConnection();
        if (!redis) return next();
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
        next();
    }
}

export const checkCacheProfile = async( req: Request | any , res: Response, next: NextFunction)=>{
    try {

        const ip = req.ip;
        const {_id} = req.decoded;
        const location = geoip.lookup(ip);
        const cacheProfile = await getCachedProfile(Number(_id));
        if(cacheProfile){
            res.json({
                message: "Cached Profile",
                user: cacheProfile,
                location: location ?? { city: '' }
            }); 
        }else{
            next()
        }
    } catch (error: any )  {  
        next();
    }
}



export const checkCacheVent = async (req: Request, res: Response , next: NextFunction)=>{
    try {
        const redis = await optionalRedisConnection();
        if (!redis) return next();

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
        next();
    } 
}

