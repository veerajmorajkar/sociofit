export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}
