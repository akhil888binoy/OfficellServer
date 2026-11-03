
import {z} from 'zod';

export const createCompanySchema = z.object({
        name : z.string().trim().min(2).max(100),
        type: z.enum(['LOCAL', 'MNC']).default('LOCAL'),
        domain : z.url({protocol: /^https?$/,hostname: z.regexes.domain}).optional(),
        description: z.string().trim().min(20).max(180).optional(),
        isRemote: z.boolean().default(false),
        industry : z.string().trim().min(1).max(80),
        city : z.string().trim().min(2).max(120).optional(),
        region: z.string().trim().min(1).max(120).optional(),
        country : z.string().trim().length(2).optional(),
        locations: z.array(z.object({ city: z.string().trim().min(1).max(120).optional(), country: z.string().trim().length(2) })).min(1).max(20).optional(),
}).superRefine((data, context) => {
        if (!data.domain && !data.description) context.addIssue({ code: 'custom', message: 'Add a public link or a short neutral description.', path: ['description'] });
        if (data.isRemote) {
                if (data.type !== 'LOCAL' || !data.country || data.country.length !== 2) context.addIssue({ code: 'custom', message: 'Choose a home country for a remote company.', path: ['country'] });
        } else if (data.type === 'MNC' && !data.locations?.length) {
                context.addIssue({ code: 'custom', message: 'Choose a company location.', path: ['locations'] });
        } else if (data.type === 'LOCAL' && !data.locations?.length && !data.country) {
                context.addIssue({ code: 'custom', message: 'Choose a country.', path: ['country'] });
        }
});

export const addCompanyLocationSchema = z.object({
        city: z.string().trim().min(1).max(120).optional(),
        country: z.string().trim().length(2),
});
