import { Tenant, SubscriptionPlan } from '../domain/tenant.entity';

export interface ITenantRepository {
  create(tenant: Partial<Tenant>): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  update(id: string, tenant: Partial<Tenant>): Promise<Tenant>;
  getPlans(): Promise<SubscriptionPlan[]>;
  getPlanById(id: string): Promise<SubscriptionPlan | null>;
}
