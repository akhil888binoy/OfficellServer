import express from 'express';
import { addSubcomment, deleteComment, deleteSubcomment, getAllSubcomments, updateComment, updateSubcomment } from '../controllers/comment.controller';
import { auth } from '../middleware/auth';
import { validateData } from '../middleware/validation';
import { addSubCommentSchema } from '../schemas/commentSchema';

export const commentRouter = express.Router();

commentRouter.delete("/comments/:id",  auth , deleteComment);
commentRouter.put("/comments/:id", auth , updateComment);
commentRouter.post("/comments/:id/subcomments", auth ,validateData(addSubCommentSchema) , addSubcomment);
commentRouter.get("/comments/:id/subcomments", auth , getAllSubcomments);
commentRouter.delete("/subcomments/:id", auth ,  deleteSubcomment);
commentRouter.put("/subcomments/:id", auth , updateSubcomment);
