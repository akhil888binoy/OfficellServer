import crypto from 'crypto';

export const createOAuthState = () => crypto.randomBytes(32).toString('hex');

export const isValidOAuthState = (expected: unknown, received: unknown) => {
    if (typeof expected !== 'string' || typeof received !== 'string') return false;
    if (!/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(received)) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};
