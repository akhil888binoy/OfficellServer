
import {z} from 'zod';

export const createCompanySchema = z.object({
        name : z.string(), 
        domain : z.url({protocol: /^https?$/,hostname: z.regexes.domain}),
        industry : z.string().max(15).optional(),
        city : z.string().optional(), 
        country : z.string().optional(),
});