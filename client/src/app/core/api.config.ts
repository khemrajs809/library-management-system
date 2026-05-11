/** Single source of truth for all API URLs */
export const API_BASE = '/api';
export const UPLOADS_BASE = '';

/** Generic API response wrapper */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  results?: any;
}
