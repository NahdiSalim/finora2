import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Get roles
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMINISTRATOR' } });
  const accountantRole = await prisma.role.findUnique({ where: { code: 'ACCOUNTANT' } });
  const collaboratorRole = await prisma.role.findUnique({ where: { code: 'COLLABORATOR' } });
  const clientRole = await prisma.role.findUnique({ where: { code: 'CLIENT' } });

  // Delete existing users and companies to avoid unique constraint errors
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // Create companies
  const accountingFirm = await prisma.company.create({
    data: {
      name: 'Cabinet Comptable FINORA',
      email: 'contact@finora-cabinet.com',
      phone: '+216 71 123 456',
      address: '123 Avenue Habib Bourguiba, Tunis',
      siret: 'SIRET123456789',
    },
  });

  const clientCompany = await prisma.company.create({
    data: {
      name: 'Entreprise Client SARL',
      email: 'contact@client-company.com',
      phone: '+216 71 987 654',
      address: '456 Rue de la République, Tunis',
      siret: 'SIRET987654321',
    },
  });

  // Create Admin user
  await prisma.user.upsert({
    where: { email: 'admin@finora.com' },
    update: {},
    create: {
      email: 'admin@finora.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'FINORA',
      phone: '+216 20 111 111',
      status: 'active',
      role: {
        connect: { id: adminRole!.id },
      },
    },
  });

  // Create Accountant user
  await prisma.user.upsert({
    where: { email: 'comptable@finora.com' },
    update: {},
    create: {
      email: 'comptable@finora.com',
      username: 'comptable',
      password: hashedPassword,
      firstName: 'Ahmed',
      lastName: 'Ben Ali',
      phone: '+216 20 222 222',
      status: 'active',
      role: {
        connect: { id: accountantRole!.id },
      },
      company: {
        connect: { id: accountingFirm.id },
      },
      position: 'Expert Comptable',
      department: 'Direction',
    },
  });

  // Create Collaborator user
  await prisma.user.upsert({
    where: { email: 'collaborateur@finora.com' },
    update: {},
    create: {
      email: 'collaborateur@finora.com',
      username: 'collaborateur',
      password: hashedPassword,
      firstName: 'Fatma',
      lastName: 'Trabelsi',
      phone: '+216 20 333 333',
      status: 'active',
      role: {
        connect: { id: collaboratorRole!.id },
      },
      company: {
        connect: { id: accountingFirm.id },
      },
      position: 'Collaborateur Comptable',
      department: 'Comptabilité',
    },
  });

  // Create Client user
  await prisma.user.upsert({
    where: { email: 'client@finora.com' },
    update: {},
    create: {
      email: 'client@finora.com',
      username: 'client',
      password: hashedPassword,
      firstName: 'Mohamed',
      lastName: 'Gharbi',
      phone: '+216 20 444 444',
      status: 'active',
      role: {
        connect: { id: clientRole!.id },
      },
      company: {
        connect: { id: clientCompany.id },
      },
      position: 'Directeur Général',
      department: 'Direction',
    },
  });

  // Create relationship between client company and accounting firm
  const clientUser = await prisma.user.findUnique({ where: { email: 'client@finora.com' } });

  if (clientUser && clientUser.companyId) {
    // Delete existing relationships first
    await prisma.clientAccountingFirmRelationship.deleteMany({
      where: {
        OR: [{ clientCompanyId: clientUser.companyId }, { accountingFirmId: accountingFirm.id }],
      },
    });

    await prisma.clientAccountingFirmRelationship.create({
      data: {
        clientCompanyId: clientUser.companyId,
        accountingFirmId: accountingFirm.id,
        invitedBy: clientUser.id, // Client user who initiated the relationship
        status: 'active',
        relationshipStart: new Date(),
      } as any,
    });
  }

  console.log(' Users seeded successfully');
  console.log(' Email: admin@finora.com | Password: password123');
  console.log(' Email: comptable@finora.com | Password: password123');
  console.log(' Email: collaborateur@finora.com | Password: password123');
  console.log(' Email: client@finora.com | Password: password123');
}
