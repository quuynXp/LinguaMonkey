export interface User {
  id: string;
  email: string;
  // Thêm các trường khác nếu cần
}

export interface AuthResponse {
  token: string;
  user: User;
}