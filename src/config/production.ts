const required = [
    'DATABASE_URL', 'SECRET_KEY', 'CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI',
    'FRONTEND_URL', 'CLOUD_NAME', 'API_KEY', 'API_SECRET',
];

export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
    if (env.NODE_ENV !== 'production') return;
    const missing = required.filter(name => !env[name]?.trim());
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    for (const name of ['FRONTEND_URL', 'REDIRECT_URI']) {
        let url: URL;
        try { url = new URL(env[name]!); } catch { throw new Error(`${name} must be an HTTPS URL`); }
        if (url.protocol !== 'https:') throw new Error(`${name} must be an HTTPS URL`);
    }
    if (env.COOKIE_SAME_SITE && !['lax', 'none'].includes(env.COOKIE_SAME_SITE)) {
        throw new Error('COOKIE_SAME_SITE must be lax or none');
    }
}
