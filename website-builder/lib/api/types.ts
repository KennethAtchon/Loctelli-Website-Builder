// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}

// Query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Combined query params
export type QueryParams = PaginationParams & FilterParams;

// API Request options
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// WebSocket/Real-time types
export interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  timestamp: string;
  userId?: number;
}

export interface ChatWebSocketMessage extends WebSocketMessage {
  type: 'chat_message' | 'typing' | 'read_receipt';
  leadId: number;
  messageId?: string;
} 