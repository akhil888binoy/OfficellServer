import {Request , Response } from 'express';
import { prisma } from "../index";


export const getReports= async (req: Request , res: Response)=>{
    const { currentPage , pageSize, category, report } = req.query;

    try {
        const reports = await prisma.reports.findMany({
            where : { category : String(category) , report: {contains: String(report)}},
            take :  Number(pageSize) ,
            skip: Number(currentPage) * Number(pageSize), 
        });
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }
}

