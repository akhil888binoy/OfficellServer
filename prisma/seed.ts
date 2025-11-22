import {prisma} from "../src/index";

async function main() {
  // --- Users ---
  const user1 = await prisma.user.create({
    data: {
      linkedin_id: "linkedin_123",
      username: "akhilbinoy",
      email: "akhil@example.com",
      avatar_url: "https://i.pravatar.cc/150?img=1",
      verification_status: 'VERIFIED',
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      linkedin_id: "linkedin_456",
      username: "devuser",
      email: "dev@example.com",
      avatar_url: "https://i.pravatar.cc/150?img=2",
      verification_status: 'UNVERIFIED',
      role: 'USER',
    },
  });

  const admin = await prisma.user.create({
    data: {
      linkedin_id: "linkedin_admin",
      username: "admin",
      email: "admin@example.com",
      verification_status: 'VERIFIED',
      role: 'ADMIN',
    },
  });

  // --- Companies ---
  const company1 = await prisma.company.create({
    data: {
      name: "Geo Infotech Pvt Ltd",
      domain: "geoinfotech.in",
      industry: "IT Services",
      city: "Bangalore",
      country: "IN",
    },
  });

  const company2 = await prisma.company.create({
    data: {
      name: "Acme Corp",
      domain: "acme.com",
      industry: "Manufacturing",
      city: "New York",
      country: "US",
    },
  });

  // --- Vents ---
  const vent1 = await prisma.vent.create({
    data: {
      company_id: company1.id,
      author_id: user1.id,
      no_pii: true,
      verified_employee: true,
      content: "The work culture here is amazing! Flexible hours and great team.",
      category: "Work Culture",
      upvote: 5,
      downvote: 1,
    },
  });

  const vent2 = await prisma.vent.create({
    data: {
      company_id: company2.id,
      author_id: user2.id,
      no_pii: true,
      verified_employee: false,
      content: "Salary increments are too slow, and management needs to improve.",
      category: "Salary",
      upvote: 2,
      downvote: 3,
    },
  });

  // --- Votes ---
  await prisma.vote.create({
    data: {
      vent_id: vent1.id,
      user_id: user2.id,
      vote: 'UPVOTE',
    },
  });

  await prisma.vote.create({
    data: {
      vent_id: vent2.id,
      user_id: user1.id,
      vote: 'DOWNVOTE',
    },
  });

  // --- Comments ---
  const comment1 = await prisma.comment.create({
    data: {
      vent_id: vent1.id,
      author_id: user2.id,
      comment: "Totally agree! My team lead is super supportive.",
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      vent_id: vent2.id,
      author_id: user1.id,
      comment: "Yes, same here. Growth opportunities are limited.",
    },
  });

  // --- SubComments ---
  await prisma.subComment.create({
    data: {
      comment_id: comment1.id,
      author_id: user1.id,
      subcomment: "Exactly! HR policies are also quite employee-friendly.",
    },
  });

  await prisma.subComment.create({
    data: {
      comment_id: comment2.id,
      author_id: user2.id,
      subcomment: "True. Many of my colleagues are also looking to switch.",
    },
  });

  // --- Media ---
  await prisma.media.create({
    data: {
      vent_id: vent1.id,
      type: 'IMAGE',
      url: "https://picsum.photos/200/300",
    },
  });

  await prisma.media.create({
    data: {
      vent_id: vent2.id,
      type: 'VIDEO',
      url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
    },
  });

  // --- Reports ---
  await prisma.reports.create({
    data: {
      vent_id: vent2.id,
      reporter_id: user1.id,
      report: "Contains inappropriate language",
      category: "Abuse",
    },
  });

  console.log("✅ Seed data created successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
