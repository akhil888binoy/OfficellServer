
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';

const storage = multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, callback) => callback(null, `officell-${randomUUID()}${file.mimetype === 'video/mp4' ? '.mp4' : '.img'}`),
});
export const upload = multer({
    storage,
    limits: { files: 4, fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        if (allowed.includes(file.mimetype)) callback(null, true);
        else callback(new Error('Only JPEG, PNG, WebP, and MP4 files are supported.'));
    },
});

export const uploadPostMedia = (req: Request, res: Response, next: NextFunction) => {
    // A post is either four small photos or one video; reject oversized requests before buffering.
    const length = Number(req.get('content-length'));
    if (Number.isFinite(length) && length > 55 * 1024 * 1024) {
        return res.status(413).json({ message: 'Attachments exceed the 50 MB upload limit.' });
    }
    upload.array('file', 4)(req, res, error => {
        if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_COUNT' ? 'Attach up to four photos.' : error.message });
        const files = (req.files ?? []) as Express.Multer.File[];
        const clean = () => { void Promise.allSettled(files.map(file => unlink(file.path))); };
        res.once('finish', clean);
        res.once('close', clean);
        next();
    });
};
