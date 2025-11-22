import {z} from 'zod';

export const addUsernameSchema = z.object({
    new_username: z.string().max(15).min(5) ,
});






