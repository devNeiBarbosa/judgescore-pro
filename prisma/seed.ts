import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@judgescore.com';
const SUPER_ADMIN_NAME = 'Super Admin';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '12345678';
const PASSWORD_ROUNDS = 10;

async function ensureSuperAdmin() {
  const targetEmail = SUPER_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, PASSWORD_ROUNDS);

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true },
  });

  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { email: targetEmail },
      data: {
        name: SUPER_ADMIN_NAME,
        password: passwordHash,
        role: 'SUPER_ADMIN',
        mustChangePassword: true,
      },
    });

    console.log(`[seed] SUPER_ADMIN já existia e foi atualizado (${targetEmail}).`);
    return;
  }

  await prisma.user.create({
    data: {
      email: targetEmail,
      name: SUPER_ADMIN_NAME,
      password: passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: null,
      mustChangePassword: true,
    },
  });

  console.log(`[seed] SUPER_ADMIN criado com sucesso (${targetEmail}).`);
}

async function main() {
  await ensureSuperAdmin();
}

main()
  .catch((error: unknown) => {
    console.error('[seed] erro:', error instanceof Error ? error.message : 'erro desconhecido');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });