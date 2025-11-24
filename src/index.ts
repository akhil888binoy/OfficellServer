import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { userRouter } from "./routes/user.route";
import { ventRouter } from "./routes/vent.route";
import { companyRouter } from "./routes/company.route";
import { reportRouter } from "./routes/report.route";
import { commentRouter } from "./routes/comment.route";
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createClient } from "redis";
import multer, { Multer } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { BloomFilter } from 'bloom-filters';

cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
export const prisma = new PrismaClient().$extends(withAccelerate());
export const client = createClient({
        username: 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT as unknown as number,
        }
    });
export const userBloomfilter = new BloomFilter(1000000,4);
export const companyBloomfilter = new BloomFilter(1000000,4);
app.set('trust proxy', true);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('combined'));
app.use(helmet({
    crossOriginOpenerPolicy: false, 
    crossOriginResourcePolicy: { policy: "cross-origin" } 
}));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.static('src/public/'));
app.get("/", (req ,res )=>{
    res.status(200).json({message : "Officell Server Running Successfully"});
});

app.use("/v1/", userRouter);
app.use("/v1/", ventRouter);
app.use("/v1/", companyRouter);
app.use("/v1/", reportRouter);
app.use("/v1/", commentRouter);

app.listen( PORT, ()=>{
    console.log(`🚀 Officell Server running on PORT : ${PORT} 📈`);
})