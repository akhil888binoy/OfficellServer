import type { Request, Response, NextFunction } from 'express';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyWriteOrigin = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production' || safeMethods.has(req.method)) return next();
    const allowed = process.env.FRONTEND_URL;
    if (!allowed) return res.status(503).json({ message: 'Frontend origin is not configured.' });
    let source: string;
    try {
        source = new URL(req.get('origin') || req.get('referer') || '').origin;
    } catch {
        return res.status(403).json({ message: 'Untrusted request origin.' });
    }
    if (source !== new URL(allowed).origin) return res.status(403).json({ message: 'Untrusted request origin.' });
    next();
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Redis coordinates limits across instances. The local bucket remains a fallback during cache outages.
export const limitRequests = (name: string, max: number, windowSeconds: number) => async (req: Request, res: Response, next: NextFunction) => {
    const identity = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `limit:${name}:${identity}`;
    const now = Date.now();
    let count: number;
    let retryAfter = windowSeconds;
    try {
        const { optionalRedisConnection } = await import('../redis/connection');
        const redis = await optionalRedisConnection();
        if (!redis) throw new Error('Redis unavailable');
        count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        else retryAfter = Math.max(1, await redis.ttl(key));
    } catch {
        if (buckets.size > 10_000) {
            for (const [entry, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(entry);
        }
        const bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
            count = 1;
        } else {
            count = ++bucket.count;
            retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        }
    }
    if (count > max) {
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
    }
    next();
};
