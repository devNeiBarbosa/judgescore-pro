import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureOrganization() {
  const orgSlug = process.env.SEED_ORG_SLUG;
  const orgName = process.env.SEED_ORG_NAME;

  if (!orgSlug || !orgName) {
    return null;
  }

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName, isActive: true },
    create: {
      slug: orgSlug,
      name: orgName,
      isActive: true,
      planType: 'EVENTO',
      licenseType: 'PER_EVENT',
      subscriptionStatus: 'ACTIVE',
    },
  });

  return org;
}

async function createTenantAdmin(organizationId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      password: hashedPassword,
      organizationId,
      role: 'ADMIN',
      name,
    },
    create: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'ADMIN',
      organizationId,
    },
  });
}

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  if (!email || !password) {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      organizationId: null,
      mustChangePassword: true,
      name,
    },
    create: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
      organizationId: null,
      mustChangePassword: true,
    },
  });
}

async function main() {
  const org = await ensureOrganization();

  if (org) {
    await createTenantAdmin(org.id);
  }

  await createSuperAdmin();
  console.log('Seed completed successfully (env-driven).');
}

main()
  .catch((e: unknown) => {
    console.error('Seed error:', e instanceof Error ? e.message : 'Unknown error');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
