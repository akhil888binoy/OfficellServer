import {z} from 'zod';
import { VENT_TOPICS } from '../utils/ventTopics';

export const reportVentSchema = z.object({
    report : z.string(),
    category : z.string()
});


export const addCommentSchema = z.object({
    comment: z.string().min(1)
});

export const updateVentSchema = z.object({ 
    company_id : z.int().optional(),
    content : z.string().trim().min(1).max(1000).optional(),
    category : z.enum(VENT_TOPICS).optional(),
});
