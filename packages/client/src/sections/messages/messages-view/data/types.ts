export type ConversationCategory = "client" | "collaborateur";

export type Conversation = {
  id: number;
  name: string;
  role: string;
  preview: string;
  fullDate: string;
  time?: string;
  avatar: string;
  avatarColor: string;
  avatarTextColor: string;
  online: boolean;
  unreadCount: number;
  phone: string;
  category: ConversationCategory; // ✅ ajouté
};

export type MessageFile = {
  name: string;
  size: string;
  type: string;
  url: string;
};

export type MessageRequest = {
  id: number;
  title: string;
  subtitle: string;
  dateLabel?: string;
  status?: string;
  urgency?: string;
};

export type Message = {
  id: number;
  type: "text" | "file" | "request";
  text?: string;
  html?: string;
  file?: MessageFile;
  request?: MessageRequest;
  mine: boolean;
  large?: boolean;
  time?: string;
  date: string;
};

export type SharedMediaFile = {
  id: number;
  name: string;
  type: "pdf" | "image" | "doc" | "xls" | "file";
  size: string;
  uploadedAt: string;
  previewUrl?: string;
};
