export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  errorId?: string;
  validationErrors?: Record<string, string>;
}
