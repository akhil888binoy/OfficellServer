import express from 'express';
import { getUserProfile, logoutUser, authLinkedin, authLinkedinCallback, addUsername, RefreshToken } from '../controllers/user.contoller';
import { auth } from '../middleware/auth';
import { validateData } from '../middleware/validation';
import { addUsernameSchema } from '../schemas/userSchema';
import { checkCacheProfile } from '../middleware/cache/checkCache';

export const userRouter = express.Router();

userRouter.get("/auth/linkedin", authLinkedin);
userRouter.get("/auth/linkedin/callback", authLinkedinCallback);
userRouter.get("/auth/refreshtoken", RefreshToken);
userRouter.post("/logout", auth , logoutUser );
userRouter.get("/profile", auth, checkCacheProfile,  getUserProfile);
userRouter.post("/add-username", auth , validateData(addUsernameSchema) , addUsername);
