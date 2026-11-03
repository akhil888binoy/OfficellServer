import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authCookieOptions } from '../config/authCookies';

export interface MyPayload extends JwtPayload {
    _id: number; 
}


export const auth = async (req: Request | any , res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.Auth; 
        if (!token) {
            throw new Error();
        }
        const decoded =  jwt.verify(token, process.env.SECRET_KEY  as jwt.Secret);
        req.decoded = decoded; 
        next();
    } catch (err) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).send('Access Denied. No refresh token provided.');
        }
        try {
            const decoded  = jwt.verify(refreshToken, process.env.SECRET_KEY  as jwt.Secret) as MyPayload ;
            const token = jwt.sign({_id : decoded._id}, process.env.SECRET_KEY  as jwt.Secret , {
                expiresIn: '1h',
            });
            res.cookie('Auth', token, authCookieOptions(60 * 60 * 1000));
            const decodedtoken = jwt.verify(token, process.env.SECRET_KEY  as jwt.Secret);
            req.decoded = decodedtoken; 
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Session expired. Please sign in again.' });
            
        }
    }
};
