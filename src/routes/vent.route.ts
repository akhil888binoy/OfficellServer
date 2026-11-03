import express from 'express';
import { addComment, createVent, deleteVent, downVote, getAllComment, getAllTrendingVents, getAllVents, getVent, getVentsCount, reportVent, updateVent, upVote } from '../controllers/vent.controller';
import { auth } from '../middleware/auth';
import { validateData } from '../middleware/validation';
import { addCommentSchema,  reportVentSchema, updateVentSchema } from '../schemas/ventSchema';
import { uploadPostMedia } from '../config/multerconfig';
import { requireUsername } from '../middleware/requireUsername';
import { limitRequests } from '../middleware/requestProtection';
export const ventRouter = express.Router();


ventRouter.get("/vents/count", auth , getVentsCount);
ventRouter.get("/vents", auth , getAllVents);
ventRouter.get("/vents/trending", auth , getAllTrendingVents);
ventRouter.get("/vents/:id", auth , getVent);
ventRouter.post("/vents", auth , requireUsername, limitRequests('publish', 5, 60), uploadPostMedia, createVent);
ventRouter.put("/vents/:id", auth , validateData(updateVentSchema), updateVent);
ventRouter.delete("/vents/:id", auth , deleteVent);
ventRouter.post("/vents/:id/upvote", auth , upVote);
ventRouter.post("/vents/:id/downvote",auth ,  downVote);
ventRouter.post("/vents/:id/report", auth , validateData(reportVentSchema) , reportVent);
ventRouter.post("/vents/:id/comments", auth , requireUsername, validateData(addCommentSchema), addComment );
ventRouter.get("/vents/:id/comments", auth , getAllComment);
