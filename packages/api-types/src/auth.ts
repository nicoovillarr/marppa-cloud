// --- Requests ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  companyId: string;
}

// --- Responses ---

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  companyId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}
