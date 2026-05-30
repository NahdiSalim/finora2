import { ChatMessage, PrismaClient } from '@prisma/client';

type UserIds = {
  clientId: number;
  comptableId: number;
  collaborateurId: number;
};

async function getActors(prisma: PrismaClient): Promise<UserIds | null> {
  const comptable = await prisma.user.findUnique({ where: { email: 'comptable@finora.com' } });
  const collaborateur = await prisma.user.findUnique({
    where: { email: 'collaborateur@finora.com' },
  });
  const client = await prisma.user.findUnique({ where: { email: 'client@finora.com' } });

  if (!comptable || !collaborateur || !client) return null;

  return {
    clientId: client.id,
    comptableId: comptable.id,
    collaborateurId: collaborateur.id,
  };
}

async function createMessages(
  prisma: PrismaClient,
  roomId: number,
  messages: { senderId: number; content: string; readBy?: number[] }[]
) {
  const created: ChatMessage[] = [];
  for (const msg of messages) {
    const readBy = (msg.readBy ?? [msg.senderId]).map(String);
    const record = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: msg.senderId,
        content: msg.content,
        type: 'text',
        readBy,
        deleted: false,
        edited: false,
      },
    });
    created.push(record);
  }

  if (created.length > 0) {
    const last = created[created.length - 1];
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageId: last.id, lastActivity: last.createdAt },
    });
  }

  return created;
}

/**
 * Seeds chat rooms, messages, and notifications for demo/report screenshots.
 */
export async function seedMessaging(prisma: PrismaClient, force = false) {
  console.log('💬 Seeding messagerie & notifications...');

  const actors = await getActors(prisma);
  if (!actors) {
    console.log('⚠️  Demo users not found — run full seed first');
    return;
  }

  const { clientId, comptableId, collaborateurId } = actors;

  if (force) {
    await prisma.notification.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.chatRoom.deleteMany({});
    console.log('   Cleared existing chat rooms, messages, and notifications');
  } else {
    const roomCount = await prisma.chatRoom.count();
    if (roomCount > 0) {
      console.log('⚠️  Chat rooms already exist — use FORCE or seed:demo to replace');
      return;
    }
  }

  // ── 1. Client ↔ Comptable (direct) ─────────────────────────────────────────
  const clientComptableRoom = await prisma.chatRoom.create({
    data: {
      type: 'direct',
      status: 'active',
      participants: [String(clientId), String(comptableId)],
      admins: [String(clientId), String(comptableId)],
      createdById: clientId,
      lastActivity: new Date(),
    },
  });

  await createMessages(prisma, clientComptableRoom.id, [
    {
      senderId: clientId,
      content: 'Bonjour, pouvez-vous valider ma déclaration TVA du T1 ?',
      readBy: [clientId, comptableId],
    },
    {
      senderId: comptableId,
      content: 'Bonjour Mohamed, bien reçu. Nous traitons votre dossier sous 48 h.',
      readBy: [comptableId], // non lu pour le client
    },
    {
      senderId: clientId,
      content: 'Parfait, merci. Je joins les relevés bancaires demain.',
      readBy: [clientId],
    },
    {
      senderId: comptableId,
      content: 'Très bien. Nous vous confirmons la réception dès analyse.',
      readBy: [clientId, comptableId],
    },
  ]);

  // ── 2. Comptable ↔ Collaborateur (direct) ───────────────────────────────────
  const comptableCollabRoom = await prisma.chatRoom.create({
    data: {
      type: 'direct',
      status: 'active',
      participants: [String(comptableId), String(collaborateurId)],
      admins: [String(comptableId), String(collaborateurId)],
      createdById: comptableId,
      lastActivity: new Date(),
    },
  });

  await createMessages(prisma, comptableCollabRoom.id, [
    {
      senderId: comptableId,
      content: 'Fatma, peux-tu finaliser le rapprochement bancaire du client Gharbi ?',
      readBy: [comptableId, collaborateurId],
    },
    {
      senderId: collaborateurId,
      content: 'Oui, je m’en occupe. Échéance prévue vendredi.',
      readBy: [comptableId, collaborateurId],
    },
    {
      senderId: comptableId,
      content: 'Merci. Priorité haute — clôture trimestrielle en cours.',
      readBy: [comptableId],
    },
  ]);

  // ── 3. Groupe — les 3 acteurs ───────────────────────────────────────────────
  const groupRoom = await prisma.chatRoom.create({
    data: {
      name: 'Suivi comptable — Trimestre 1',
      type: 'group',
      status: 'active',
      description: 'Coordination dossier client et échéances fiscales',
      participants: [String(comptableId), String(collaborateurId), String(clientId)],
      admins: [String(comptableId)],
      createdById: comptableId,
      lastActivity: new Date(),
    },
  });

  await createMessages(prisma, groupRoom.id, [
    {
      senderId: comptableId,
      content: 'Bienvenue dans le groupe de suivi T1. Merci de centraliser les échanges ici.',
      readBy: [comptableId, collaborateurId, clientId],
    },
    {
      senderId: collaborateurId,
      content: 'Les écritures de mars sont validées. Prochaine étape : liasse fiscale.',
      readBy: [comptableId, collaborateurId],
    },
    {
      senderId: clientId,
      content: 'Merci pour la réactivité. Avez-vous besoin de documents supplémentaires ?',
      readBy: [clientId], // non lu pour le comptable (2e conversation)
    },
    {
      senderId: comptableId,
      content: 'Oui, merci d’envoyer les factures fournisseurs de février via l’espace Documents.',
      readBy: [comptableId, collaborateurId, clientId],
    },
  ]);

  // ── 4. Notifications de démonstration ───────────────────────────────────────
  const notifications = [
    {
      recipientId: collaborateurId,
      type: 'task',
      title: 'Nouvelle tâche assignée',
      message: 'Ahmed Ben Ali vous a assigné une nouvelle tâche',
      data: JSON.stringify({ taskId: 1, actorId: comptableId }),
      actionUrl: '/tasks/1',
      priority: 'normal',
      read: false,
    },
    {
      recipientId: clientId,
      type: 'request',
      title: 'Réponse à votre demande',
      message: 'Votre comptable a répondu à votre demande',
      data: JSON.stringify({ requestId: 1, actorId: comptableId }),
      actionUrl: '/requests/1',
      priority: 'high',
      read: false,
    },
    {
      recipientId: comptableId,
      type: 'task',
      title: 'Tâche terminée',
      message: 'Fatma Trabelsi a terminé la tâche',
      data: JSON.stringify({ taskId: 2, actorId: collaborateurId }),
      actionUrl: '/tasks/2',
      priority: 'normal',
      read: true,
      readAt: new Date(),
    },
    {
      recipientId: clientId,
      type: 'message',
      title: 'Nouveau message',
      message: 'Ahmed Ben Ali vous a envoyé un message',
      data: JSON.stringify({ roomId: clientComptableRoom.id, actorId: comptableId }),
      actionUrl: `/messages/${clientComptableRoom.id}`,
      priority: 'normal',
      read: false,
    },
    {
      recipientId: collaborateurId,
      type: 'request',
      title: 'Nouvelle demande',
      message: 'Mohamed Gharbi a créé une nouvelle demande',
      data: JSON.stringify({ requestId: 3, actorId: clientId }),
      actionUrl: '/requests/3',
      priority: 'high',
      read: false,
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log('✅ Messagerie seeded:');
  console.log('   - 3 conversations (2 directes + 1 groupe)');
  console.log(`   - ${3 + 3 + 4} messages professionnels`);
  console.log(`   - ${notifications.length} notifications`);
}
