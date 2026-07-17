import { ITenantRepository } from './tenant.repository.interface';
import { Tenant, SubscriptionPlan } from '../domain/tenant.entity';
import { pool } from '../config/database';

export class TenantRepository implements ITenantRepository {
  async create(tenant: Partial<Tenant>): Promise<Tenant> {
    const query = `
      INSERT INTO tenants (name, domain, status, subscription_plan_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, domain, status, subscription_plan_id AS "subscriptionPlanId", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      tenant.name,
      tenant.domain,
      tenant.status || 'active',
      tenant.subscriptionPlanId,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<Tenant | null> {
    const query = `
      SELECT id, name, domain, status, subscription_plan_id AS "subscriptionPlanId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows.length ? rows[0] : null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const query = `
      SELECT id, name, domain, status, subscription_plan_id AS "subscriptionPlanId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      WHERE domain = $1
    `;
    const { rows } = await pool.query(query, [domain]);
    return rows.length ? rows[0] : null;
  }

  async update(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
    const query = `
      UPDATE tenants
      SET name = COALESCE($1, name),
          domain = COALESCE($2, domain),
          status = COALESCE($3, status),
          subscription_plan_id = COALESCE($4, subscription_plan_id)
      WHERE id = $5
      RETURNING id, name, domain, status, subscription_plan_id AS "subscriptionPlanId", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      tenant.name,
      tenant.domain,
      tenant.status,
      tenant.subscriptionPlanId,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT id, name, code, description, price_monthly AS "priceMonthly", price_yearly AS "priceYearly",
             max_projects AS "maxProjects", max_users AS "maxUsers", max_storage_gb AS "maxStorageGb", features
      FROM subscription_plans
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const query = `
      SELECT id, name, code, description, price_monthly AS "priceMonthly", price_yearly AS "priceYearly",
             max_projects AS "maxProjects", max_users AS "maxUsers", max_storage_gb AS "maxStorageGb", features
      FROM subscription_plans
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows.length ? rows[0] : null;
  }
}
