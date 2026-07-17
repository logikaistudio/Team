export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  status: string;
  subscriptionPlanId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxProjects: number;
  maxUsers: number;
  maxStorageGb: number;
  features?: Record<string, unknown>;
}
