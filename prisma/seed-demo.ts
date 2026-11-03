import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Fictional preview content for local development only. Re-running replaces the entire demo set.
const databaseUrl = process.env.DATABASE_URL;
const hostname = databaseUrl ? new URL(databaseUrl).hostname : '';
if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
  throw new Error('Demo data can only be seeded into a local PostgreSQL database.');
}

const prisma = new PrismaClient();
const writers = [
  { key: 'quill', username: 'quietquill' },
  { key: 'hours', username: 'afterhours' },
  { key: 'desk', username: 'desknoted' },
  { key: 'break', username: 'breakroom42' },
  { key: 'shift', username: 'nightshift' },
] as const;
type Writer = typeof writers[number]['key'];

const companies = [
  { key: 'juniper_blr', name: 'Juniper Stack (Demo)', type: 'LOCAL', industry: 'Software', city: 'Bengaluru', region: 'Karnataka', country: 'IN', description: 'A fictional small software team building tools for local retailers.', locations: [{ city: 'Bengaluru', country: 'IN', mapLat: 12.9716, mapLng: 77.5946 }] },
  { key: 'juniper_pune', name: 'Juniper Stack (Demo)', type: 'LOCAL', industry: 'Software', city: 'Pune', region: 'Maharashtra', country: 'IN', description: 'A separate fictional software company with the same name, based in Pune.', locations: [{ city: 'Pune', country: 'IN', mapLat: 18.5204, mapLng: 73.8567 }] },
  { key: 'foldline', name: 'Foldline Studio (Demo)', type: 'LOCAL', industry: 'Design', city: 'Kochi', region: 'Kerala', country: 'IN', description: 'A fictional independent design studio serving growing businesses.', locations: [{ city: 'Kochi', country: 'IN', mapLat: 9.9312, mapLng: 76.2673 }] },
  { key: 'cedarbrook', name: 'Cedarbrook Health (Demo)', type: 'LOCAL', industry: 'Healthcare', city: 'Hyderabad', region: 'Telangana', country: 'IN', description: 'A fictional health technology company with a small product team.', locations: [{ city: 'Hyderabad', country: 'IN', mapLat: 17.3850, mapLng: 78.4867 }] },
  { key: 'fleetstone', name: 'Fleetstone Retail (Demo)', type: 'LOCAL', industry: 'Retail', city: 'Mumbai', region: 'Maharashtra', country: 'IN', description: 'A fictional regional retailer with stores and a central operations team.', locations: [{ city: 'Mumbai', country: 'IN', mapLat: 19.0760, mapLng: 72.8777 }] },
  { key: 'quietdesk', name: 'QuietDesk (Demo)', type: 'LOCAL', industry: 'Software', city: null, region: null, country: 'IN', isRemote: true, description: 'A fictional remote software company with a home base in India.', locations: [] },
  { key: 'atlasfield', name: 'Atlas Field (Demo)', type: 'MNC', industry: 'Logistics', city: null, region: null, country: null, description: 'A fictional logistics group with teams across India, Singapore, and the UAE.', locations: [{ city: null, country: 'IN', mapLat: 22.3511, mapLng: 78.6677 }, { city: null, country: 'SG', mapLat: 1.3571, mapLng: 103.8195 }, { city: null, country: 'AE', mapLat: 24.0002, mapLng: 53.9995 }] },
  { key: 'meridian', name: 'Meridian Systems (Demo)', type: 'MNC', industry: 'Technology', city: null, region: null, country: null, description: 'A fictional technology company with teams in India, the UK, and the US.', locations: [{ city: null, country: 'IN', mapLat: 22.3511, mapLng: 78.6677 }, { city: null, country: 'GB', mapLat: 54.0, mapLng: -2.0 }, { city: null, country: 'US', mapLat: 39.8283, mapLng: -98.5795 }] },
] as const;
type CompanyKey = typeof companies[number]['key'];

const stories: Array<{ company: CompanyKey; author: Writer; topic: string; content: string; country?: string; hoursAgo: number; votes?: number }> = [
  { company: 'juniper_blr', author: 'quill', topic: 'Leadership', hoursAgo: 1, votes: 3, content: 'We keep changing priorities after the sprint starts. A short written explanation from leadership would save the team from repeating work.' },
  { company: 'atlasfield', author: 'hours', topic: 'Remote', country: 'IN', hoursAgo: 3, votes: 2, content: 'Cross-country meetings land outside normal hours for the India team. Rotating the meeting time would spread that burden more fairly.' },
  { company: 'foldline', author: 'desk', topic: 'Pay', hoursAgo: 6, votes: 2, content: 'The studio has clear project rates for clients but no written salary bands for staff. I would like the same clarity in our pay conversations.' },
  { company: 'meridian', author: 'break', topic: 'Careers', country: 'GB', hoursAgo: 9, votes: 2, content: 'Promotion criteria seem to change between countries. A common set of role expectations would make internal moves easier to understand.' },
  { company: 'cedarbrook', author: 'shift', topic: 'Workload', hoursAgo: 12, votes: 3, content: 'Urgent requests keep arriving late in the day. A shared priority list and a real handoff for the next shift would help the team recover.' },
  { company: 'quietdesk', author: 'quill', topic: 'Remote', hoursAgo: 16, votes: 1, content: 'Remote work is part of the job, but decisions still happen in private calls. Posting the decision and its owner in a shared place would help.' },
  { company: 'fleetstone', author: 'hours', topic: 'HR', hoursAgo: 21, votes: 2, content: 'Store staff and office staff get different answers to the same leave question. One policy page with a clear contact person would be useful.' },
  { company: 'juniper_pune', author: 'desk', topic: 'Coworkers', hoursAgo: 27, votes: 1, content: 'A teammate helped document our handoffs and made a difficult launch easier. Small acts of cooperation deserve more recognition here.' },
  { company: 'atlasfield', author: 'break', topic: 'Pay', country: 'SG', hoursAgo: 32, votes: 2, content: 'People moving between country teams cannot find a clear explanation of local pay adjustments. Transparent ranges would make transfers less confusing.' },
  { company: 'meridian', author: 'shift', topic: 'Ethics', country: 'US', hoursAgo: 37, votes: 1, content: 'A vendor selection process would benefit from a written conflict-of-interest policy. It should be easy to raise a concern before a contract is signed.' },
  { company: 'foldline', author: 'hours', topic: 'Careers', hoursAgo: 43, votes: 2, content: 'Junior designers do good work but have no clear path to the next level. Specific examples of the skills needed would help everyone plan.' },
  { company: 'cedarbrook', author: 'quill', topic: 'Harassment', hoursAgo: 49, votes: 2, content: 'A teammate raised a concern about repeated dismissive comments in meetings. A private reporting route and a fair follow-up process would make it safer to speak up.' },
  { company: 'fleetstone', author: 'desk', topic: 'Layoffs', hoursAgo: 56, votes: 1, content: 'After a restructure, the remaining team still has the old workload. A clear plan for what work stops would be more helpful than another vague update.' },
  { company: 'quietdesk', author: 'break', topic: 'Coworkers', hoursAgo: 64, votes: 2, content: 'The new async check-in has made it easier to ask for help without waiting for a meeting. It is one small change that actually works.' },
  { company: 'juniper_blr', author: 'shift', topic: 'Workload', hoursAgo: 72, votes: 1, content: 'On-call coverage has grown while the team has not. A published rotation and protected recovery time would make the arrangement sustainable.' },
  { company: 'atlasfield', author: 'desk', topic: 'Leadership', country: 'AE', hoursAgo: 81, votes: 1, content: 'Country teams hear about policy changes at different times. A single written announcement with local contacts would keep everyone aligned.' },
  { company: 'meridian', author: 'quill', topic: 'Remote', country: 'IN', hoursAgo: 91, votes: 2, content: 'Office attendance rules are clear, but exceptions are handled differently between teams. Consistent guidance would prevent unnecessary friction.' },
  { company: 'juniper_pune', author: 'break', topic: 'Pay', hoursAgo: 106, votes: 1, content: 'The job ad gave a salary range, which made applying easier. I hope existing staff get the same transparency during review season.' },
  { company: 'fleetstone', author: 'shift', topic: 'Leadership', hoursAgo: 120, votes: 2, content: 'Store targets are announced before staffing plans are settled. Asking managers for capacity estimates first would make the targets more realistic.' },
  { company: 'cedarbrook', author: 'hours', topic: 'HR', hoursAgo: 139, votes: 1, content: 'The onboarding guide is helpful, but new starters still do not know where to ask practical questions. A named point of contact would fix that.' },
  { company: 'foldline', author: 'break', topic: 'Ethics', hoursAgo: 161, votes: 1, content: 'Client feedback sometimes arrives through personal messages. Keeping decisions in a shared project thread would create a better record for everyone.' },
  { company: 'meridian', author: 'desk', topic: 'Layoffs', country: 'GB', hoursAgo: 185, votes: 1, content: 'A team restructure was announced without explaining how handoffs would work. A simple transition plan would reduce uncertainty for the people staying.' },
];

const discussions = [
  { story: 0, author: 'desk', comment: 'A decision log helped our team avoid this exact kind of rework.', replyAuthor: 'quill', reply: 'That sounds useful. Even a short note would help.' },
  { story: 1, author: 'shift', comment: 'Rotating the time is a fair suggestion. We tried it on a different team.', replyAuthor: 'hours', reply: 'I would be happy with that compromise.' },
  { story: 2, author: 'break', comment: 'Publishing a band would make reviews less mysterious.' },
  { story: 4, author: 'hours', comment: 'A handoff checklist might help separate urgent work from work that can wait.' },
  { story: 7, author: 'quill', comment: 'It is nice to see a positive story in the feed.' },
  { story: 9, author: 'desk', comment: 'A clear way to disclose a conflict protects the team and the vendor.', replyAuthor: 'shift', reply: 'Exactly. The process should be straightforward.' },
  { story: 11, author: 'break', comment: 'The follow-up process matters as much as the reporting route.' },
  { story: 12, author: 'quill', comment: 'Stopping lower-priority work should be part of the plan.' },
  { story: 14, author: 'hours', comment: 'Recovery time after on-call should be scheduled in advance.' },
  { story: 17, author: 'shift', comment: 'That kind of transparency is useful for people already on the team too.' },
] as const;

async function main() {
  const cleanOnly = process.argv.includes('--clean');
  const counts = await prisma.$transaction(async tx => {
    const oldUsers = await tx.user.findMany({ where: { OR: [
      { linkedin_id: { startsWith: 'officell-demo-' } },
      { linkedin_id: { startsWith: 'local-author-' } },
      { linkedin_id: { startsWith: 'local-reader-' } },
    ] }, select: { id: true } });
    const oldUserIds = oldUsers.map(user => user.id);
    const oldCompanies = await tx.company.findMany({ where: { OR: [
      { name: { endsWith: '(Demo)' } },
      { name: { startsWith: 'Local Test Company' } },
    ] }, select: { id: true } });
    const oldCompanyIds = oldCompanies.map(company => company.id);
    const realPostsOnDemoCompanies = oldCompanyIds.length ? await tx.vent.count({ where: { company_id: { in: oldCompanyIds }, author_id: { notIn: oldUserIds } } }) : 0;
    if (realPostsOnDemoCompanies) throw new Error('A real user posted on a demo company. Move or review that post before cleaning demo data.');

    if (oldCompanyIds.length) await tx.company.deleteMany({ where: { id: { in: oldCompanyIds } } });
    if (oldUserIds.length) await tx.user.deleteMany({ where: { id: { in: oldUserIds } } });
    if (cleanOnly) return { removedCompanies: oldCompanyIds.length, removedUsers: oldUserIds.length, companies: 0, stories: 0 };

    const userIds = {} as Record<Writer, number>;
    for (const writer of writers) {
      const user = await tx.user.create({ data: {
        linkedin_id: `officell-demo-${writer.key}`,
        email: `${writer.key}@officell-demo.invalid`,
        username: writer.username,
      } });
      userIds[writer.key] = user.id;
    }

    const companyIds = {} as Record<CompanyKey, number>;
    const locationIds = new Map<string, number>();
    for (const fixture of companies) {
      const company = await tx.company.create({ data: {
        name: fixture.name,
        type: fixture.type as 'LOCAL' | 'MNC',
        industry: fixture.industry,
        city: fixture.city,
        region: fixture.region,
        country: fixture.country,
        description: fixture.description,
        isRemote: 'isRemote' in fixture ? fixture.isRemote : false,
        mapLat: fixture.type === 'LOCAL' && fixture.locations.length ? fixture.locations[0].mapLat : null,
        mapLng: fixture.type === 'LOCAL' && fixture.locations.length ? fixture.locations[0].mapLng : null,
      } });
      companyIds[fixture.key] = company.id;
      for (const place of fixture.locations) {
        const location = await tx.companyLocation.create({ data: { companyId: company.id, city: place.city, country: place.country, mapLat: place.mapLat, mapLng: place.mapLng } });
        locationIds.set(`${fixture.key}:${place.country}`, location.id);
      }
    }

    const ventIds: number[] = [];
    for (const story of stories) {
      const vent = await tx.vent.create({ data: {
        company_id: companyIds[story.company],
        location_id: locationIds.get(`${story.company}:${story.country ?? 'IN'}`) ?? null,
        author_id: userIds[story.author],
        category: story.topic,
        content: story.content,
        showUsername: true,
        no_pii: false,
        verified_employee: false,
        createdAt: new Date(Date.now() - story.hoursAgo * 60 * 60 * 1000),
      } });
      ventIds.push(vent.id);
      const otherWriters = writers.filter(writer => writer.key !== story.author).slice(0, story.votes ?? 0);
      for (const voter of otherWriters) await tx.vote.create({ data: { vent_id: vent.id, user_id: userIds[voter.key], vote: 'UPVOTE' } });
      await tx.vent.update({ where: { id: vent.id }, data: { upvote: otherWriters.length } });
    }

    for (const discussion of discussions) {
      const comment = await tx.comment.create({ data: {
        vent_id: ventIds[discussion.story], author_id: userIds[discussion.author], comment: discussion.comment, showUsername: true,
      } });
      if ('reply' in discussion) await tx.subComment.create({ data: {
        comment_id: comment.id, author_id: userIds[discussion.replyAuthor], subcomment: discussion.reply, showUsername: true,
      } });
    }
    return { removedCompanies: oldCompanyIds.length, removedUsers: oldUserIds.length, companies: companies.length, stories: stories.length };
  }, { timeout: 30000 });
  console.log(`${cleanOnly ? 'Cleaned' : 'Refreshed'} local demo data: removed ${counts.removedCompanies} companies and ${counts.removedUsers} users; added ${counts.companies} companies and ${counts.stories} stories.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
