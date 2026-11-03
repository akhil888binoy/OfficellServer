import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

export async function requireUsername(req: Request | any, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.decoded._id) }, select: { username: true } });
    if (!user?.username || !/^[A-Za-z0-9_]{5,15}$/.test(user.username)) {
      return res.status(409).json({ code: 'USERNAME_REQUIRED', message: 'Choose a username before posting.' });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not check your username.' });
  }
}
