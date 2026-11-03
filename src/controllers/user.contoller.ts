import {Request , Response } from 'express';
import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from "../index";
import geoip from 'geoip-lite';
import crypto from "crypto";
import { createOAuthState, isValidOAuthState } from '../utils/oauthState';
import { getCachedProfile, writeCachedProfile } from '../redis/profileCache';
import { authCookieOptions, clearAuthCookieOptions } from '../config/authCookies';




export interface MyPayload extends JwtPayload {
    _id: number; 
}

export const authLinkedin = (req: Request , res : Response )=>{
    const state = createOAuthState();
    res.cookie('linkedin_oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
        path: '/v1/auth/linkedin/callback',
    });
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.CLIENT_ID || '',
        redirect_uri: process.env.REDIRECT_URI || '',
        state,
        scope: 'profile email openid',
    });
    res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}

export const authLinkedinCallback = async (req: Request , res : Response )=>{
    const code = req.query.code;
    const validState = isValidOAuthState(req.cookies.linkedin_oauth_state, req.query.state);
    res.clearCookie('linkedin_oauth_state', {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/v1/auth/linkedin/callback',
    });
    if (!validState || typeof code !== 'string') {
        return res.status(400).json({ message: 'Invalid LinkedIn sign-in response.' });
    }
    try {

    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            },
    });

    const accessToken = tokenResponse?.data.access_token;

    const profileResponse: any  = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = profileResponse?.data;
    const user = await prisma.user.findUnique({
        where:{linkedin_id : String(data.sub)}
    });

    if (user == null){
        const hashedEmail = crypto.createHash("sha256").update(data.email).digest("hex");
        const add_user = await prisma.user.create({
            data : {
                linkedin_id: data.sub,
                email: hashedEmail,
            }
        });
        void writeCachedProfile(add_user);
        const token = jwt.sign({ _id: add_user.id }, process.env.SECRET_KEY  as jwt.Secret, {
                expiresIn: '1h',
        });
        const refreshToken = jwt.sign({ _id: add_user.id }, process.env.SECRET_KEY  as jwt.Secret , {
            expiresIn :'1d'
        });

        res.cookie('Auth', token, authCookieOptions(60 * 60 * 1000));
        res.cookie('refreshToken', refreshToken, authCookieOptions(24 * 60 * 60 * 1000));
        res.redirect(`${process.env.FRONTEND_URL}/username`);
    }else{
        void writeCachedProfile(user);
        const token = jwt.sign({_id : user?.id}, process.env.SECRET_KEY as jwt.Secret, {
            expiresIn: '1h',
        });
        const refreshToken = jwt.sign({ _id: user?.id }, process.env.SECRET_KEY  as jwt.Secret , {
            expiresIn :'1d'
        });
        res.cookie('Auth', token, authCookieOptions(60 * 60 * 1000));
        res.cookie('refreshToken', refreshToken, authCookieOptions(24 * 60 * 60 * 1000));
        res.redirect(`${process.env.FRONTEND_URL}${user.username ? '/feed' : '/username'}`);
    }
    } catch (error: any) {
        console.error('LinkedIn sign-in failed', error);
        res.status(500).json({ message: 'LinkedIn sign-in failed.' });
    }
}

export const RefreshToken = async( req: Request , res: Response)=>{

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).send('Access Denied. No refresh token provided.');
    }

    try {
    const decoded  = jwt.verify(refreshToken, process.env.SECRET_KEY  as jwt.Secret) as MyPayload;
    
    const token = jwt.sign({_id : decoded._id}, process.env.SECRET_KEY  as jwt.Secret , {
        expiresIn: '1h',
    });

    res.cookie('Auth', token, authCookieOptions(60 * 60 * 1000));
    return res.status(200).send("Token refreshed");
    } catch (error) {
        return res.status(400).send('Invalid refresh token.');
    }
}


export const getUserProfile = async (req: Request | any  , res : Response ) => {
    const { _id } = req.decoded;
    const ip = req.ip;
    const location = geoip.lookup(ip);
    try {
        const cached = await getCachedProfile(Number(_id));
        const user = cached ?? await prisma.user.findUnique({ where: { id: Number(_id) } });
        if (user !== null){
            if (!cached) void writeCachedProfile(user);

            res.status(200).json({
                message : "Get Profile Successfull",
                user : user,
                location: location ?? { city: '' }
            }); 
        }else{
                res.status(401).json({
                message : "User doesn't exist",
                id : _id
            }); 
        }

    } catch (error: any ) {
        res.status(500).json(error);
    }
}

export const addUsername = async (req: Request | any  , res : Response ) => {
    const { _id } = req.decoded;
    const {new_username} = req.body;
    
    try {
        const user = await prisma.user.update({
            where: {id : _id},
            data: { username: new_username }
        });
        void writeCachedProfile(user);
        return res.status(200).json({
            message : "Username updated successfully",
            user
        });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        console.error(error);
        return res.status(500).json({ message: 'Could not save username.' });
    }
}

export const logoutUser = async (req: Request | any , res : Response )=>{
    try {
        const options = clearAuthCookieOptions();
        res.clearCookie('Auth', options);
        res.clearCookie('refreshToken', options);
        res.clearCookie('RefreshExist', options); // Clear the marker issued by older versions.
        res.status(200).json({message : "User Logged out Successfully"});

    } catch (error : any ) {
        console.error(error); 
        res.status(500).json(error)
    }
}


