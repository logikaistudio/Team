export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Role {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  description?: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
  description?: string;
}
