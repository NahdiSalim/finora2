export type RequestType =
  | "accounting"
  | "tax"
  | "consultation"
  | "document"
  | "other";
export type RequestUrgency = "low" | "normal" | "high" | "urgent";
export type RequestStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "cancelled";

export interface RequestClient {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface RequestAssignee {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface RequestTask {
  id: number;
  title: string;
  status: string;
  assignee?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface Request {
  id: number;
  subject: string;
  topic?: string | null;
  description?: string | null;
  type: RequestType;
  urgency: RequestUrgency;
  status: RequestStatus;
  response?: string | null;
  attachments: string[];
  attachmentUrls?: string[];
  desiredResponseDate?: string | null;
  desiredResponseTime?: string | null;
  clientId: number;
  companyId?: number | null;
  assignedToId?: number | null;
  convertedToTaskId?: number | null;
  client?: RequestClient | null;
  assignedTo?: RequestAssignee | null;
  convertedToTask?: RequestTask | null;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string | null;
  resolvedAt?: string | null;
  convertedAt?: string | null;
}

export interface RequestFormData {
  subject: string;
  type: RequestType;
  urgency: RequestUrgency;
  topic?: string;
  description?: string;
  desiredResponseDate?: string;
  desiredResponseTime?: string;
  attachments?: File[];
}

export interface GetRequestsParams {
  page?: number;
  limit?: number;
  status?: RequestStatus | string;
  urgency?: RequestUrgency | string;
  sortBy?: "urgency" | "createdAt";
  search?: string;
}

export interface GetRequestsResponse {
  success: boolean;
  data: Request[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    pending: number;
    in_progress: number;
    resolved: number;
    rejected: number;
    cancelled: number;
  };
}

export interface CreateRequestResponse {
  success: boolean;
  message: string;
  data: Request;
}

export interface UpdateRequestDto {
  subject?: string;
  description?: string;
  type?: RequestType;
  urgency?: RequestUrgency;
  status?: RequestStatus;
  topic?: string;
  desiredResponseDate?: string;
  desiredResponseTime?: string;
  assignedToId?: number | null;
}

export interface RespondRequestDto {
  response: string;
}

export interface ConvertToTaskDto {
  assigneeId: number;
  dueDate?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}
