import { PrismaClient } from '@prisma/client';

/**
 * Ensures the demo client company is linked to the FINORA accounting firm.
 * Safe to run multiple times (upsert).
 */
export async function seedClientAccountingRelationship(prisma: PrismaClient) {
  console.log('🔄 Seeding client ↔ cabinet comptable relationship...');

  const accountingFirm = await prisma.company.findFirst({
    where: { type: 'accounting_firm' },
  });

  let clientCompany = await prisma.company.findFirst({
    where: { type: 'client' },
  });

  const clientUser = await prisma.user.findUnique({
    where: { email: 'client@finora.com' },
  });

  const accountantUser = await prisma.user.findUnique({
    where: { email: 'comptable@finora.com' },
  });

  if (!accountingFirm) {
    console.log('⚠️  No accounting firm company found — run full seed first');
    return;
  }

  if (!clientUser) {
    console.log('⚠️  client@finora.com not found — run full seed first');
    return;
  }

  // Ensure client user is linked to a client company
  if (!clientUser.companyId && clientCompany) {
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { companyId: clientCompany.id },
    });
    console.log('   Linked client user to client company');
  } else if (!clientUser.companyId && !clientCompany) {
    clientCompany = await prisma.company.create({
      data: {
        name: 'Entreprise Client SARL',
        email: 'contact@client-company.com',
        phone: '+216 71 987 654',
        address: '456 Rue de la République',
        city: 'Tunis',
        postalCode: '1001',
        country: 'Tunisie',
        type: 'client',
        status: 'active',
      },
    });
    await prisma.user.update({
      where: { id: clientUser.id },
      data: { companyId: clientCompany.id },
    });
    console.log('   Created client company and linked user');
  }

  const clientCompanyId = clientUser.companyId ?? clientCompany?.id;
  if (!clientCompanyId) {
    console.log('⚠️  Could not resolve client company ID');
    return;
  }

  const existing = await prisma.clientAccountingFirmRelationship.findFirst({
    where: {
      clientCompanyId,
      accountingFirmId: accountingFirm.id,
    },
  });

  if (existing) {
    if (existing.status !== 'active' && existing.status !== 'accepted') {
      await prisma.clientAccountingFirmRelationship.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          relationshipStart: existing.relationshipStart ?? new Date(),
          responseDate: new Date(),
          respondedBy: accountantUser?.id ?? clientUser.id,
        },
      });
      console.log('✅ Reactivated existing relationship (status → active)');
    } else {
      console.log('✅ Relationship already active');
    }
    return;
  }

  await prisma.clientAccountingFirmRelationship.create({
    data: {
      clientCompanyId,
      accountingFirmId: accountingFirm.id,
      invitedBy: clientUser.id,
      invitationType: 'client_to_accountant',
      status: 'active',
      relationshipStart: new Date(),
      responseDate: new Date(),
      respondedBy: accountantUser?.id ?? clientUser.id,
    },
  });

  console.log(
    `✅ Relationship created: client company #${clientCompanyId} ↔ ${accountingFirm.name}`
  );
}
