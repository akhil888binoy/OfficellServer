import {z} from 'zod';

export const reportVentSchema = z.object({
    report : z.string(),
    category : z.string()
});


export const addCommentSchema = z.object({
    comment: z.string().min(1)
});

export const updateVentSchema = z.object({ 
    company_id : z.int().optional(),
    no_pii : z.boolean().optional(),
    content : z.string().optional(),
    category : z.string().optional(),
});
