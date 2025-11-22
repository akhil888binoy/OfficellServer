import express from 'express';
import { createCompany, getAllCompanies, getCompaniesCount, getCompany } from '../controllers/company.controller';
import { auth } from '../middleware/auth';
import { validateData } from '../middleware/validation';
import { createCompanySchema } from '../schemas/companySchema';
import {checkCacheCompany } from '../middleware/cache/checkCache';

export const companyRouter = express.Router();

companyRouter.get("/companies/count",auth, getCompaniesCount);
companyRouter.get("/companies", auth ,  getAllCompanies);
companyRouter.get("/companies/:id", auth , checkCacheCompany, getCompany);
companyRouter.post("/companies", auth , validateData(createCompanySchema)  ,createCompany);
