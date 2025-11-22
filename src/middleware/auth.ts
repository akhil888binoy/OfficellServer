import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface MyPayload extends JwtPayload {
    _id: number; 
}


export const auth = async (req: Request | any , res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
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
            res.cookie('Auth', token, {
                maxAge: 1 * 60 * 60 * 1000, // 60 minutes   
            }); 
            const decodedtoken = jwt.verify(token, process.env.SECRET_KEY  as jwt.Secret);
            req.decoded = decodedtoken; 
            next();
        } catch (error) {
            res.redirect(`${process.env.FRONTEND_URL}/sessionexpired`)
            return res.status(400).send('Invalid refresh token.');
            
        }
    }
};
