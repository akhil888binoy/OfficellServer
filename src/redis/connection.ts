import { client } from '../index';

let retryAfter = 0;
let connecting: Promise<boolean> | null = null;

// Redis is an optional cache. A slow or unavailable host must never hold up sign-in.
export const optionalRedisConnection = async () => {
    if (client.isReady) return client;
    if (Date.now() < retryAfter) return null;

    if (!connecting) {
        connecting = client.connect()
            .then(() => true)
            .catch(() => {
                retryAfter = Date.now() + 30_000;
                return false;
            })
            .finally(() => { connecting = null; });
    }

    const connected = await Promise.race([
        connecting,
        new Promise<false>(resolve => setTimeout(() => resolve(false), 150)),
    ]);
    return connected && client.isReady ? client : null;
};
