export type ConversationCategory = "client" | "collaborateur" | "group";

export type GroupMember = {
  id: number;
  name: string;
  role: "client" | "collaborateur";
  avatar: string;
};

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
  category: ConversationCategory;
  // Group-specific fields
  isGroup?: boolean;
  members?: GroupMember[];
  memberCount?: number;
  createdBy?: number;
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

export type MessageTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
};

export type MessageAppointment = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
};

export type Message = {
  id: number;
  type: "text" | "file" | "request" | "task" | "appointment";
  text?: string;
  html?: string;
  file?: MessageFile;
  request?: MessageRequest;
  task?: MessageTask;
  appointment?: MessageAppointment;
  mine: boolean;
  large?: boolean;
  time?: string;
  date: string;
  // For group messages
  senderName?: string;
  senderAvatar?: string;
};

export type SharedMediaFile = {
  id: number;
  name: string;
  type: "pdf" | "image" | "doc" | "xls" | "file";
  size: string;
  uploadedAt: string;
  previewUrl?: string;
};
