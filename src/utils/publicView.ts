// Keep account IDs private; only posts explicitly marked for public usernames expose a handle.
export const weekStartUTC = (value: Date) => {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date;
};

export const publicCompany = <T extends { createdAt: Date; updatedAt: Date }>(company: T) => ({
    ...company,
    createdAt: weekStartUTC(company.createdAt),
    updatedAt: undefined,
});

export const forViewerVent = <T extends { author_id: number; showUsername?: boolean; author?: { username: string | null } | null; createdAt?: Date; updatedAt?: Date; Media?: Array<{ createdAt?: Date }> }>(vent: T, viewerId: number) => ({
    ...vent,
    author_id: vent.author_id === viewerId ? vent.author_id : null,
    author: { username: vent.showUsername && vent.author?.username ? vent.author.username : 'Anonymous' },
    createdAt: vent.createdAt ? weekStartUTC(vent.createdAt) : undefined,
    updatedAt: undefined,
    Media: vent.Media?.map(({ createdAt, ...safeMedia }) => safeMedia),
    // Historical rows may still have these unverified flags set to true.
    no_pii: false,
    verified_employee: false,
});

export const forViewerSubcomment = <T extends { author_id?: number; showUsername?: boolean; author?: { id: number; username?: string | null } | null; createdAt?: Date }>(reply: T, viewerId: number) => ({
    ...reply,
    author_id: reply.author_id === viewerId ? viewerId : null,
    author: { id: reply.author?.id === viewerId ? viewerId : null, username: reply.showUsername && reply.author?.username ? reply.author.username : 'Anonymous' },
    createdAt: reply.createdAt ? weekStartUTC(reply.createdAt) : undefined,
});

export const forViewerComment = <T extends { author_id: number; showUsername?: boolean; author?: { username?: string | null } | null; createdAt?: Date; subcomments?: Array<{ author_id?: number; showUsername?: boolean; author?: { id: number; username?: string | null } | null; createdAt?: Date }> }>(comment: T, viewerId: number) => ({
    ...comment,
    author_id: comment.author_id === viewerId ? viewerId : null,
    author: { username: comment.showUsername && comment.author?.username ? comment.author.username : 'Anonymous' },
    createdAt: comment.createdAt ? weekStartUTC(comment.createdAt) : undefined,
    subcomments: comment.subcomments?.map(reply => forViewerSubcomment(reply, viewerId)),
});
