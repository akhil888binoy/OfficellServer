import { Router } from 'express';
import { auth } from '../middleware/auth';
import { followCompany, followTopic, getFeedPreferences, getNotifications, readNotifications, updateAlertPreferences } from '../controllers/feed.controller';

export const feedRouter = Router();
feedRouter.get('/feed/preferences', auth, getFeedPreferences);
feedRouter.put('/feed/follows/companies/:id', auth, followCompany);
feedRouter.delete('/feed/follows/companies/:id', auth, followCompany);
feedRouter.put('/feed/follows/topics/:topic', auth, followTopic);
feedRouter.delete('/feed/follows/topics/:topic', auth, followTopic);
feedRouter.put('/feed/alerts', auth, updateAlertPreferences);
feedRouter.get('/notifications', auth, getNotifications);
feedRouter.put('/notifications/read', auth, readNotifications);
