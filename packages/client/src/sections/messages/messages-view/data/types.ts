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
};

export type MessageFile = {
  name: string;
  size: string;
  type: string;
  url: string;
};

export type Message = {
  id: number;
  type: "text" | "file";
  text?: string;
  html?: string;
  file?: MessageFile;
  mine: boolean;
  large?: boolean;
  time?: string;
  date: string;
};

export type SharedMediaFile = {
  id: number;
  name: string;
  type: "pdf" | "image" | "doc" | "xls";
  size: string;
  uploadedAt: string;
  previewUrl?: string;
};
