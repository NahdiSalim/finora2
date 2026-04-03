import type {
  Conversation,
  Message,
  SharedMediaFile,
  MessageRequest,
  GroupMember,
} from "./types";

const now = new Date();
const threeHoursAgo = new Date(new Date().setHours(new Date().getHours() - 3));

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

/* =========================
   CONVERSATIONS
========================= */

export const conversations: Conversation[] = [
  {
    id: 1,
    name: "Douaa Maalel",
    role: "Audit / Accountant",
    preview: "Vous: cc",
    fullDate: now.toISOString(),
    time: formatTime(now),
    avatar: "D",
    avatarColor: "#D9D9D9",
    avatarTextColor: "#666666",
    online: true,
    unreadCount: 2,
    phone: "21651524007",
    category: "client", // ✅
  },
  {
    id: 2,
    name: "Marin Doe",
    role: "Audit / Accountant",
    preview: "Bonjour Katie",
    fullDate: threeHoursAgo.toISOString(),
    time: formatTime(threeHoursAgo),
    avatar: "M",
    avatarColor: "#8E44EC",
    avatarTextColor: "#FFFFFF",
    online: true,
    unreadCount: 0,
    phone: "21666123456",
    category: "collaborateur", // ✅
  },
  {
    id: 3,
    name: "Douaa Maalel",
    role: "Audit / Accountant",
    preview: "Hello, how can I help you?",
    fullDate: "2025-08-25T10:00:00.000Z",
    time: "10:00 AM",
    avatar: "D",
    avatarColor: "#D9D9D9",
    avatarTextColor: "#666666",
    online: false,
    unreadCount: 5,
    phone: "21677123456",
    category: "client",
  },
  {
    id: 4,
    name: "Douaa Maalel",
    role: "Audit / Accountant",
    preview: "Vous: Réponse test",
    fullDate: "2025-12-31T10:00:00.000Z",
    time: "10:00 AM",
    avatar: "D",
    avatarColor: "#D9D9D9",
    avatarTextColor: "#666666",
    online: false,
    unreadCount: 0,
    phone: "21688123456",
    category: "collaborateur",
  },
];

/* =========================
   MESSAGE REQUESTS
========================= */

export const messageRequests: MessageRequest[] = [
  {
    id: 101,
    title: "Bilan 2025",
    subtitle: "Déclaration CNSS",
    dateLabel: "15 Oct 2024",
    status: "En cours",
    urgency: "Urgent !",
  },
  {
    id: 102,
    title: "Bilan 2025",
    subtitle: "Déclaration CNSS",
    dateLabel: "15 Oct 2024",
    status: "En cours",
    urgency: "Urgent !",
  },
  {
    id: 103,
    title: "Bilan 2025",
    subtitle: "Déclaration CNSS",
    dateLabel: "15 Oct 2024",
    status: "En cours",
    urgency: "Urgent !",
  },
  {
    id: 104,
    title: "Bilan 2025",
    subtitle: "Déclaration CNSS",
    dateLabel: "15 Oct 2024",
    status: "En cours",
    urgency: "Urgent !",
  },
  {
    id: 105,
    title: "Bilan 2025",
    subtitle: "Déclaration CNSS",
    dateLabel: "15 Oct 2024",
    status: "En cours",
    urgency: "Urgent !",
  },
];

/* =========================
   MESSAGES
========================= */

export const messagesByConversation: Record<number, Message[]> = {
  1: [
    {
      id: 1,
      type: "text",
      text: "Hello Katie ! Hope you're doing well. I need your help with some reports.",
      mine: false,
      large: true,
      date: "2026-03-08",
    },
    {
      id: 2,
      type: "text",
      text: "Thank you",
      mine: false,
      time: "10:40 AM",
      date: "2026-03-08",
    },
    {
      id: 3,
      type: "file",
      file: {
        name: "Rapport_financier_2025.pdf",
        size: "2.4 MB",
        type: "application/pdf",
        url: "/media/document-preview-1.png",
      },
      mine: false,
      time: "10:42 AM",
      date: "2026-03-08",
    },
    {
      id: 4,
      type: "text",
      text: "cc",
      mine: true,
      time: formatTime(now),
      date: now.toISOString().split("T")[0],
    },
  ],

  2: [
    {
      id: 1,
      type: "text",
      text: "Bonjour Katie",
      mine: false,
      date: "2026-03-10",
    },
  ],

  3: [
    {
      id: 1,
      type: "text",
      text: "Hi Douaa!",
      mine: true,
      date: "2026-03-07",
    },
  ],

  4: [
    {
      id: 1,
      type: "text",
      text: "Réponse test",
      mine: true,
      date: "2026-03-10",
    },
  ],

  // Group chat messages
  1001: [
    {
      id: 1,
      type: "text",
      text: "Bonjour à tous ! J'ai préparé le rapport trimestriel.",
      mine: false,
      time: "14:30",
      date: "2026-03-30",
      senderName: "Marie Dubois",
      senderAvatar: "MD",
    },
    {
      id: 2,
      type: "text",
      text: "Merci Marie ! Je vais le réviser cet après-midi.",
      mine: false,
      time: "14:35",
      date: "2026-03-30",
      senderName: "Jean Martin",
      senderAvatar: "JM",
    },
    {
      id: 3,
      type: "file",
      file: {
        name: "Rapport_Q1_2026.pdf",
        size: "3.2 MB",
        type: "application/pdf",
        url: "/media/document-preview-1.png",
      },
      mine: false,
      time: "14:40",
      date: "2026-03-30",
      senderName: "Marie Dubois",
      senderAvatar: "MD",
    },
    {
      id: 4,
      type: "text",
      text: "Les documents sont prêts pour la révision",
      mine: false,
      time: "15:20",
      date: "2026-03-30",
      senderName: "Marie Dubois",
      senderAvatar: "MD",
    },
    {
      id: 5,
      type: "text",
      text: "Parfait ! Merci à tous pour votre travail.",
      mine: true,
      time: "15:25",
      date: "2026-03-30",
    },
  ],

  1002: [
    {
      id: 1,
      type: "text",
      text: "N'oubliez pas la réunion demain à 10h",
      mine: true,
      time: "16:00",
      date: "2026-03-29",
    },
    {
      id: 2,
      type: "text",
      text: "Merci pour le rappel !",
      mine: false,
      time: "16:15",
      date: "2026-03-29",
      senderName: "Jean Martin",
      senderAvatar: "JM",
    },
    {
      id: 3,
      type: "text",
      text: "Je serai présent 👍",
      mine: false,
      time: "16:20",
      date: "2026-03-29",
      senderName: "Sophie Laurent",
      senderAvatar: "SL",
    },
  ],

  1003: [
    {
      id: 1,
      type: "text",
      text: "Bonjour, voici les documents fiscaux du Q1",
      mine: false,
      time: "09:00",
      date: "2026-03-25",
      senderName: "Thomas Bernard",
      senderAvatar: "TB",
    },
    {
      id: 2,
      type: "file",
      file: {
        name: "Documents_Fiscaux_Q1.zip",
        size: "5.8 MB",
        type: "application/zip",
        url: "/media/document-preview-1.png",
      },
      mine: false,
      time: "09:05",
      date: "2026-03-25",
      senderName: "Thomas Bernard",
      senderAvatar: "TB",
    },
    {
      id: 3,
      type: "text",
      text: "Je vais envoyer les documents ce soir",
      mine: false,
      time: "18:30",
      date: "2026-03-25",
      senderName: "Thomas Bernard",
      senderAvatar: "TB",
    },
  ],
};

/* =========================
   SHARED MEDIA
========================= */

export const sharedMediaFiles: SharedMediaFile[] = [
  {
    id: 1,
    name: "Facture Fatales.pdf",
    type: "pdf",
    size: "2.4 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/facture-preview-1.png",
  },
  {
    id: 2,
    name: "Facture Fatales.xls",
    type: "xls",
    size: "1.8 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/table-preview-1.png",
  },
  {
    id: 3,
    name: "Facture Fatales.png",
    type: "image",
    size: "3.2 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/receipt-preview-1.png",
  },
  {
    id: 4,
    name: "Fraa expenses.xls",
    type: "xls",
    size: "1.6 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/table-preview-2.png",
  },
  {
    id: 5,
    name: "Facture Fatales.xls",
    type: "xls",
    size: "1.7 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/table-preview-1.png",
  },
  {
    id: 6,
    name: "Facture Fatales.png",
    type: "image",
    size: "2.9 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/receipt-preview-1.png",
  },
  {
    id: 7,
    name: "Document_preview.png",
    type: "image",
    size: "1.5 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/document-preview-1.png",
  },
  {
    id: 8,
    name: "Facture Fatales.pdf",
    type: "pdf",
    size: "2.1 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/facture-preview-2.png",
  },
  {
    id: 9,
    name: "Facture Fatales.pdf",
    type: "pdf",
    size: "2.1 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/facture-preview-2.png",
  },
  {
    id: 10,
    name: "Facture Fatales.pdf",
    type: "pdf",
    size: "2.1 MB",
    uploadedAt: "09 Sep, at 21:30",
    previewUrl: "/media/facture-preview-2.png",
  },
];

/* =========================
   GROUP CHATS
========================= */

export const groupConversations: Conversation[] = [
  {
    id: 1001,
    name: "Équipe Comptabilité 2026",
    role: "5 membres",
    preview: "Marie: Les documents sont prêts pour la révision",
    fullDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    time: formatTime(new Date(Date.now() - 2 * 60 * 60 * 1000)),
    avatar: "EC",
    avatarColor: "#3B82F6",
    avatarTextColor: "#FFFFFF",
    online: false,
    unreadCount: 3,
    phone: "",
    category: "group",
    isGroup: true,
    memberCount: 5,
    createdBy: 1,
    members: [
      { id: 2, name: "Marie Dubois", role: "collaborateur", avatar: "MD" },
      { id: 3, name: "Jean Martin", role: "client", avatar: "JM" },
      { id: 4, name: "Sophie Laurent", role: "client", avatar: "SL" },
      { id: 5, name: "Pierre Durand", role: "collaborateur", avatar: "PD" },
      { id: 6, name: "Claire Moreau", role: "client", avatar: "CM" },
    ],
  },
  {
    id: 1002,
    name: "Clients Prioritaires",
    role: "3 membres",
    preview: "Vous: N'oubliez pas la réunion demain",
    fullDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    time: formatTime(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    avatar: "CP",
    avatarColor: "#10B981",
    avatarTextColor: "#FFFFFF",
    online: false,
    unreadCount: 0,
    phone: "",
    category: "group",
    isGroup: true,
    memberCount: 3,
    createdBy: 1,
    members: [
      { id: 3, name: "Jean Martin", role: "client", avatar: "JM" },
      { id: 4, name: "Sophie Laurent", role: "client", avatar: "SL" },
      { id: 6, name: "Claire Moreau", role: "client", avatar: "CM" },
    ],
  },
  {
    id: 1003,
    name: "Projet Fiscal Q1",
    role: "4 membres",
    preview: "Thomas: Je vais envoyer les documents ce soir",
    fullDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    time: formatTime(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    avatar: "PF",
    avatarColor: "#8B5CF6",
    avatarTextColor: "#FFFFFF",
    online: false,
    unreadCount: 0,
    phone: "",
    category: "group",
    isGroup: true,
    memberCount: 4,
    createdBy: 1,
    members: [
      { id: 7, name: "Thomas Bernard", role: "collaborateur", avatar: "TB" },
      { id: 8, name: "Emma Petit", role: "client", avatar: "EP" },
      { id: 9, name: "Lucas Roux", role: "collaborateur", avatar: "LR" },
      { id: 10, name: "Camille Blanc", role: "client", avatar: "CB" },
    ],
  },
];

/* =========================
   AVAILABLE USERS FOR GROUP CREATION
========================= */

export const availableClients: GroupMember[] = [
  { id: 3, name: "Jean Martin", role: "client", avatar: "JM" },
  { id: 4, name: "Sophie Laurent", role: "client", avatar: "SL" },
  { id: 6, name: "Claire Moreau", role: "client", avatar: "CM" },
  { id: 8, name: "Emma Petit", role: "client", avatar: "EP" },
  { id: 10, name: "Camille Blanc", role: "client", avatar: "CB" },
  { id: 11, name: "Hugo Garnier", role: "client", avatar: "HG" },
  { id: 12, name: "Léa Fournier", role: "client", avatar: "LF" },
  { id: 13, name: "Nathan Girard", role: "client", avatar: "NG" },
];

export const availableCollaborators: GroupMember[] = [
  { id: 2, name: "Marie Dubois", role: "collaborateur", avatar: "MD" },
  { id: 5, name: "Pierre Durand", role: "collaborateur", avatar: "PD" },
  { id: 7, name: "Thomas Bernard", role: "collaborateur", avatar: "TB" },
  { id: 9, name: "Lucas Roux", role: "collaborateur", avatar: "LR" },
  { id: 14, name: "Chloé Leroy", role: "collaborateur", avatar: "CL" },
  { id: 15, name: "Maxime Simon", role: "collaborateur", avatar: "MS" },
];
