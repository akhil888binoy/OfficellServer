import type { User } from '@prisma/client';
import { createHash } from 'crypto';
import { optionalRedisConnection } from './connection';

let namespace: string | null = null;
const profileKey = (userId: number) => {
    namespace ??= createHash('sha256').update(process.env.DATABASE_URL ?? 'default').digest('hex').slice(0, 12);
    return `Profile:${namespace}:${userId}`;
};
const ttlSeconds = 300;

export async function getCachedProfile(userId: number): Promise<User | null> {
    try {
        const redis = await optionalRedisConnection();
        const cached = redis ? await redis.get(profileKey(userId)) : null;
        return cached ? JSON.parse(cached) as User : null;
    } catch {
        return null;
    }
}

export async function writeCachedProfile(user: User): Promise<void> {
    try {
        const redis = await optionalRedisConnection();
        if (redis) await redis.setEx(profileKey(user.id), ttlSeconds, JSON.stringify(user));
    } catch {
        // The database remains the source of truth when cache writes fail.
    }
}
