import { PrismaClient } from '@prisma/client';

export async function seedChatRooms(prisma: PrismaClient) {
  console.log('📨 Seeding chat rooms...');

  // Safety check - only seed if there are no chat rooms yet
  const chatRoomCount = await prisma.chatRoom.count();
  if (chatRoomCount > 0) {
    console.log('⚠️  Skipping chat room seed - rooms already exist');
    return;
  }

  // Get users
  const admin = await prisma.user.findUnique({ where: { email: 'admin@finora.com' } });
  const comptable = await prisma.user.findUnique({ where: { email: 'comptable@finora.com' } });
  const collaborateur = await prisma.user.findUnique({
    where: { email: 'collaborateur@finora.com' },
  });
  const client = await prisma.user.findUnique({ where: { email: 'client@finora.com' } });

  if (!admin || !comptable || !collaborateur || !client) {
    console.log('⚠️  Users not found, skipping chat room seed');
    return;
  }

  // Create direct conversation between client and accountant
  const clientComptableRoom = await prisma.chatRoom.create({
    data: {
      type: 'direct',
      status: 'active',
      participants: [String(client.id), String(comptable.id)],
      admins: [String(client.id), String(comptable.id)],
      createdById: client.id,
      lastActivity: new Date(),
    },
  });

  // Create direct conversation between accountant and collaborator
  const comptableCollabRoom = await prisma.chatRoom.create({
    data: {
      type: 'direct',
      status: 'active',
      participants: [String(comptable.id), String(collaborateur.id)],
      admins: [String(comptable.id), String(collaborateur.id)],
      createdById: comptable.id,
      lastActivity: new Date(),
    },
  });

  // Create a group room with accountant, collaborator, and client
  const groupRoom = await prisma.chatRoom.create({
    data: {
      name: 'Projet Comptabilité Q1',
      type: 'group',
      status: 'active',
      description: 'Discussions sur le projet comptable du premier trimestre',
      participants: [String(comptable.id), String(collaborateur.id), String(client.id)],
      admins: [String(comptable.id)],
      createdById: comptable.id,
      lastActivity: new Date(),
    },
  });

  // Add some initial messages to the client-accountant room
  await prisma.chatMessage.create({
    data: {
      roomId: clientComptableRoom.id,
      senderId: client.id,
      content: "Bonjour, j'ai une question concernant ma déclaration fiscale.",
      type: 'text',
      readBy: [String(client.id)],
      deleted: false,
      edited: false,
    },
  });

  await prisma.chatMessage.create({
    data: {
      roomId: clientComptableRoom.id,
      senderId: comptable.id,
      content: 'Bonjour Mohamed, je suis à votre disposition. Quelle est votre question ?',
      type: 'text',
      readBy: [String(comptable.id)],
      deleted: false,
      edited: false,
    },
  });

  // Add a message to the accountant-collaborator room
  await prisma.chatMessage.create({
    data: {
      roomId: comptableCollabRoom.id,
      senderId: comptable.id,
      content: 'Fatma, peux-tu vérifier les documents du client Mohamed ?',
      type: 'text',
      readBy: [String(comptable.id)],
      deleted: false,
      edited: false,
    },
  });

  // Add a message to the group room
  await prisma.chatMessage.create({
    data: {
      roomId: groupRoom.id,
      senderId: comptable.id,
      content: 'Bienvenue dans le groupe du projet Q1! Nous allons coordonner nos efforts ici.',
      type: 'text',
      readBy: [String(comptable.id)],
      deleted: false,
      edited: false,
    },
  });

  // Update last message IDs for rooms
  const clientComptableMessages = await prisma.chatMessage.findMany({
    where: { roomId: clientComptableRoom.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  const comptableCollabMessages = await prisma.chatMessage.findMany({
    where: { roomId: comptableCollabRoom.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  const groupMessages = await prisma.chatMessage.findMany({
    where: { roomId: groupRoom.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (clientComptableMessages[0]) {
    await prisma.chatRoom.update({
      where: { id: clientComptableRoom.id },
      data: { lastMessageId: clientComptableMessages[0].id },
    });
  }

  if (comptableCollabMessages[0]) {
    await prisma.chatRoom.update({
      where: { id: comptableCollabRoom.id },
      data: { lastMessageId: comptableCollabMessages[0].id },
    });
  }

  if (groupMessages[0]) {
    await prisma.chatRoom.update({
      where: { id: groupRoom.id },
      data: { lastMessageId: groupMessages[0].id },
    });
  }

  console.log('✅ Chat rooms seeded successfully');
  console.log(`   - Created ${3} rooms`);
  console.log(`   - Created ${4} messages`);
}
