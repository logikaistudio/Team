export interface UserPayload {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
  tokens: AuthTokens;
}
