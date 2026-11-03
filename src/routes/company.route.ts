import express from 'express';
import { addCompanyLocation, createCompany, getAllCompanies, getCompaniesCount, getCompany, getMapCompanies, getCompanyMapConfig, searchCompanyLocations, reverseCompanyLocationAtPoint } from '../controllers/company.controller';
import { auth } from '../middleware/auth';
import { validateData } from '../middleware/validation';
import { addCompanyLocationSchema, createCompanySchema } from '../schemas/companySchema';
import { limitRequests } from '../middleware/requestProtection';

export const companyRouter = express.Router();

companyRouter.get("/companies/count",auth, getCompaniesCount);
companyRouter.get("/companies/map/config", auth, getCompanyMapConfig);
companyRouter.get("/companies/map", auth, getMapCompanies);
companyRouter.get("/companies/locations/search", auth, searchCompanyLocations);
companyRouter.get("/companies/locations/reverse", auth, reverseCompanyLocationAtPoint);
companyRouter.get("/companies", auth ,  getAllCompanies);
companyRouter.get("/companies/:id", auth , getCompany);
companyRouter.post("/companies", auth , limitRequests('company-create', 3, 3600), validateData(createCompanySchema)  ,createCompany);
companyRouter.post("/companies/:id/locations", auth, limitRequests('location-create', 10, 3600), validateData(addCompanyLocationSchema), addCompanyLocation);
