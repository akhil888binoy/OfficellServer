import { Request, Response } from 'express';
import { prisma } from '../index';
import { isVentTopic } from '../utils/ventTopics';

const viewer = (req: Request | any) => Number(req.decoded._id);

export async function getFeedPreferences(req: Request | any, res: Response) {
  try {
    const userId = viewer(req);
    const [companies, followedTopics, alerts] = await Promise.all([
      prisma.companyFollow.findMany({ where: { userId }, select: { companyId: true } }),
      prisma.topicFollow.findMany({ where: { userId }, select: { topic: true } }),
      prisma.notificationPreference.findUnique({ where: { userId } }),
    ]);
    res.json({ companyIds: companies.map(item => item.companyId), topics: followedTopics.map(item => item.topic), alerts: { replies: alerts?.replies ?? false, companyPosts: alerts?.companyPosts ?? false } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not load feed preferences.' }); }
}

export async function followCompany(req: Request | any, res: Response) {
  const companyId = Number(req.params.id);
  if (!Number.isInteger(companyId) || companyId < 1) return res.status(400).json({ message: 'Invalid company.' });
  try {
    if (req.method === 'PUT') {
      if (!await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })) return res.status(404).json({ message: 'Company not found.' });
      await prisma.companyFollow.upsert({ where: { userId_companyId: { userId: viewer(req), companyId } }, update: {}, create: { userId: viewer(req), companyId } });
    } else {
      await prisma.companyFollow.deleteMany({ where: { userId: viewer(req), companyId } });
    }
    res.json({ following: req.method === 'PUT' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not update follow.' }); }
}

export async function followTopic(req: Request | any, res: Response) {
  const topic = req.params.topic;
  if (!isVentTopic(topic)) return res.status(400).json({ message: 'Unknown topic.' });
  try {
    if (req.method === 'PUT') await prisma.topicFollow.upsert({ where: { userId_topic: { userId: viewer(req), topic } }, update: {}, create: { userId: viewer(req), topic } });
    else await prisma.topicFollow.deleteMany({ where: { userId: viewer(req), topic } });
    res.json({ following: req.method === 'PUT' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not update topic.' }); }
}

export async function updateAlertPreferences(req: Request | any, res: Response) {
  const { replies, companyPosts } = req.body ?? {};
  if (typeof replies !== 'boolean' || typeof companyPosts !== 'boolean') return res.status(400).json({ message: 'Both alert options must be booleans.' });
  try {
    const alerts = await prisma.notificationPreference.upsert({ where: { userId: viewer(req) }, update: { replies, companyPosts }, create: { userId: viewer(req), replies, companyPosts } });
    res.json({ alerts: { replies: alerts.replies, companyPosts: alerts.companyPosts } });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not save alert preferences.' }); }
}

export async function getNotifications(req: Request | any, res: Response) {
  try {
    const userId = viewer(req);
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
        include: { vent: { include: { company: true } } } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const withVent = items as unknown as Array<typeof items[number] & { vent: { company: { name: string } } }>;
    res.json({ notifications: withVent.map(({ vent, ...item }) => ({ ...item, companyName: vent.company.name })), unread });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not load notifications.' }); }
}

export async function readNotifications(req: Request | any, res: Response) {
  try {
    await prisma.notification.updateMany({ where: { userId: viewer(req), readAt: null }, data: { readAt: new Date() } });
    res.json({ unread: 0 });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not mark notifications as read.' }); }
}
