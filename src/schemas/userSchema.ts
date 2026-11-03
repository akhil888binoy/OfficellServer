import {z} from 'zod';

export const addUsernameSchema = z.object({
    new_username: z.string().trim().regex(/^[A-Za-z0-9_]{5,15}$/, 'Use 5–15 letters, numbers, or underscores.'),
});






