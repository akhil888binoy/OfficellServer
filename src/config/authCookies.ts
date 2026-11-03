import type { CookieOptions } from 'express';

// A cross-site frontend can opt into SameSite=None; HTTPS is required for it.
const sameSite = (): CookieOptions['sameSite'] =>
    process.env.NODE_ENV === 'production' && process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';

export const authCookieOptions = (maxAge: number, httpOnly = true): CookieOptions => ({
    maxAge,
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: sameSite(),
    domain: process.env.DOMAIN || undefined,
    path: '/',
});

export const clearAuthCookieOptions = (): CookieOptions => {
    const { maxAge, ...options } = authCookieOptions(0);
    return options;
};
