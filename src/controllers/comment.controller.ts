import {Request , Response } from 'express';
import { prisma } from "../index";
import { forViewerSubcomment } from '../utils/publicView';
import { findBlockingPrivacyIssues } from '../utils/privacyCheck';


export const addSubcomment = async (req: Request | any , res: Response)=>{
    const {_id } = req.decoded;
    const { id } = req.params;
    const { subcomment } = req.body;
    const privacyIssues = findBlockingPrivacyIssues(subcomment);
    if (privacyIssues.length > 0) {
        return res.status(422).json({ message: 'Remove identifying details before replying.', privacyIssues });
    }
    try {
        const add_subcomment = await prisma.subComment.create({
            data:{
                comment_id: Number(id),
                author_id: Number(_id),
                showUsername: true,
                subcomment: subcomment,
            }
        });
        try {
            const parent = await prisma.comment.findUnique({ where: { id: Number(id) }, select: { author_id: true, vent_id: true } });
            if (parent && parent.author_id !== Number(_id)) {
                const pref = await prisma.notificationPreference.findUnique({ where: { userId: parent.author_id } });
                if (pref?.replies) await prisma.notification.create({ data: { userId: parent.author_id, ventId: parent.vent_id, kind: 'COMMENT_REPLY' } });
            }
        } catch (alertError) { console.error('Could not create comment reply notification', alertError); }

        const current_subcomment = await prisma.subComment.findUnique(({
            where:{id: add_subcomment.id},
            include:{
                author:{
                    select:{ 
                        id:true,
                        username:true
                        
                    }
                }
            }
        }))

        res.status(201).json({
            message: "SubComment created",
            subcomment: current_subcomment ? forViewerSubcomment(current_subcomment, Number(_id)) : null
        });

    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error);
    }

}

export const getAllSubcomments = async (req: Request | any, res: Response )=>{
    const {id } = req.params;
    const viewerId = Number(req.decoded._id);
    try {
        const subcomments = await prisma.subComment.findMany({
            where:{
                comment_id: Number(id)
            },
            include: { author: { select: { id: true, username: true } } },
        })
        res.status(201).json({
            message: "SubComments",
            subcomments: subcomments.map(reply => forViewerSubcomment(reply, viewerId))
        });
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }
}
export const updateSubcomment= async(req: Request | any , res: Response)=>{
    const{id} = req.params;
    const{_id} = req.decoded;
    const {subcomment} = req.body;
    if (typeof subcomment === 'string') {
        const privacyIssues = findBlockingPrivacyIssues(subcomment);
        if (privacyIssues.length > 0) return res.status(422).json({ message: 'Remove identifying details before saving.', privacyIssues });
    }
    try {
        const update_subcomment = await prisma.subComment.update({
            where:{id : Number(id) , author_id: Number(_id)},
            data:{
                subcomment: subcomment
            }
        });

        res.status(200).json({
            "message":"Updated Subcomment",
            "subcomment": update_subcomment
        });
    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error)
    }
}
export const deleteSubcomment= async ( req: Request | any , res: Response)=>{
    const{ id } = req.params;
    const{_id} = req.decoded;

    try {
        const delete_subcomment = await prisma.subComment.delete({
            where:{id : Number(id), author_id: Number(_id)}
        });
        res.status(200).json({
            message: "Deleted SubComment Successfully",
            deleted_subcomment: delete_subcomment
        });
    } catch (error: any ) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const updateComment = async(req: Request | any , res: Response)=>{
    const {id} = req.params;
    const {_id} = req.decoded;
    const {comment}=req.body;
    if (typeof comment === 'string') {
        const privacyIssues = findBlockingPrivacyIssues(comment);
        if (privacyIssues.length > 0) return res.status(422).json({ message: 'Remove identifying details before saving.', privacyIssues });
    }
    try {
        const update_comment= await prisma.comment.update({ 
            where:{id: Number(id), author_id: Number(_id)},
            data:{
                comment:String(comment)
            }
        });
        res.status(200).json({
            message:"Update Comment",
            comment:update_comment
        });
    } catch (error : any ) {
        console.error(error);
        res.status(500).json(error);
    }
}

export const deleteComment = async (req: Request | any , res: Response)=>{
    const{ id } = req.params;
    const{_id} = req.decoded;
    const {vent_id} = req.query;

    try {
        const delete_comment = await prisma.comment.delete({
            where:{id : Number(id), author_id: Number(_id)}
        });
        res.status(200).json({
            message: "Deleted Comment Successfully",
            deleted_comment: delete_comment
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json(error);
    }
}

