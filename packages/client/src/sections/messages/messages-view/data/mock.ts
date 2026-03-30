import type {
  Conversation,
  Message,
  SharedMediaFile,
  MessageRequest,
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
