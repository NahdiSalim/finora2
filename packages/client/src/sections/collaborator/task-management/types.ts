export interface TaskUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface TaskComment {
  id: string;
  userId: number;
  username: string;
  comment: string;
  attachments: string[];
  createdAt: string;
  user?: TaskUser;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  type: "accounting" | "review" | "meeting" | "document" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "in_review" | "completed" | "cancelled";
  dueDate: string | null;
  progress: number;
  assigneeId: number;
  assignee: TaskUser;
  createdById: number;
  createdBy: TaskUser;
  clientId: number | null;
  client: TaskUser | null;
  companyId: number | null;
  company: {
    id: number;
    name: string;
  } | null;
  attachments: string[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface KanbanColumn {
  id: "todo" | "in_progress" | "in_review" | "completed";
  title: string;
  color: string;
  tasks: Task[];
}

export const COLUMN_CONFIG_ACCOUNTANT: Record<
  KanbanColumn["id"],
  { title: string; color: string }
> = {
  todo: {
    title: "À faire",
    color: "#EF4444",
  },
  in_progress: {
    title: "En cours",
    color: "#F59E0B",
  },
  in_review: {
    title: "En révision",
    color: "#8B5CF6",
  },
  completed: {
    title: "Terminé",
    color: "#10B981",
  },
};

export const COLUMN_CONFIG_COLLABORATOR: Record<
  KanbanColumn["id"],
  { title: string; color: string }
> = {
  todo: {
    title: "À faire",
    color: "#EF4444",
  },
  in_progress: {
    title: "En cours",
    color: "#F59E0B",
  },
  in_review: {
    title: "En révision",
    color: "#8B5CF6",
  },
  completed: {
    title: "Terminé",
    color: "#10B981",
  },
};

export const PRIORITY_CONFIG = {
  low: {
    label: "Basse",
    color: "#10B981",
  },
  medium: {
    label: "Normale",
    color: "#6B7280",
  },
  high: {
    label: "Haute",
    color: "#F59E0B",
  },
  urgent: {
    label: "Urgent !",
    color: "#EF4444",
  },
};
