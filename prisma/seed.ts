import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding VVRobots Marketing Media database...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const editorPassword = await bcrypt.hash('editor123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vvrobots.ro' },
    update: {},
    create: {
      name: 'Admin VVRobots',
      email: 'admin@vvrobots.ro',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@vvrobots.ro' },
    update: {},
    create: {
      name: 'Editor Marketing',
      email: 'editor@vvrobots.ro',
      passwordHash: editorPassword,
      role: Role.EDITOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@vvrobots.ro' },
    update: {},
    create: {
      name: 'Membru Echipa (Viewer)',
      email: 'viewer@vvrobots.ro',
      passwordHash: viewerPassword,
      role: Role.VIEWER,
    },
  });

  console.log('Users created: admin@vvrobots.ro / editor@vvrobots.ro / viewer@vvrobots.ro');

  // 2. Create Tags
  const tagNames = ['robot', 'echipa', 'sponsor', 'premiere', 'pit-area', 'meciuri'];
  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Create Sample Season
  const season = await prisma.season.create({
    data: {
      name: 'Sezonul 2025-2026 - INTO THE DEEP',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-05-31'),
    },
  });

  // 4. Create Sample Events
  const event1 = await prisma.event.create({
    data: {
      seasonId: season.id,
      name: 'Regional Cluj-Napoca 2026',
      location: 'Sala Polivalentă Cluj',
      startDate: new Date('2026-02-14'),
      endDate: new Date('2026-02-16'),
    },
  });

  const event2 = await prisma.event.create({
    data: {
      seasonId: season.id,
      name: 'Campionatul Național FTC București 2026',
      location: 'Romexpo București',
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-22'),
    },
  });

  // 5. Create Sample Days for Event 1
  await prisma.day.create({
    data: {
      eventId: event1.id,
      date: new Date('2026-02-14'),
      label: 'Ziua 1 - Inspecție tehnică și Pits setup',
    },
  });

  await prisma.day.create({
    data: {
      eventId: event1.id,
      date: new Date('2026-02-15'),
      label: 'Ziua 2 - Meciuri de Calificare',
    },
  });

  await prisma.day.create({
    data: {
      eventId: event1.id,
      date: new Date('2026-02-16'),
      label: 'Ziua 3 - Finale și Festivitatea de Premiere',
    },
  });

  // Sample Days for Event 2
  await prisma.day.create({
    data: {
      eventId: event2.id,
      date: new Date('2026-03-20'),
      label: 'Ziua 1 - Acces echipe & Standuri',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
