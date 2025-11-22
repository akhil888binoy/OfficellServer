import express from 'express';
import { getReports } from '../controllers/report.controller';
import { auth } from '../middleware/auth';

export const reportRouter = express.Router();

reportRouter.get("/reports", auth , getReports);
