import { pool } from '../config/database';
import { BadRequestError } from '../utils/errors';

export class EnterpriseUseCase {
  
  // ==========================================================================
  // DOCUMENT CONTROL & APPROVALS WORKFLOW
  // ==========================================================================
  
  async createDocument(tenantId: string, projectId: string, title: string, docNumber: string, category: string): Promise<any> {
    const query = `
      INSERT INTO documents (tenant_id, project_id, title, doc_number, category, status)
      VALUES ($1, $2, $3, $4, $5, 'draft')
      RETURNING id, title, doc_number as "docNumber", category, status
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, title, docNumber, category]);
    return rows[0];
  }

  async uploadVersion(tenantId: string, documentId: string, versionString: string, s3Key: string, fileSizeBytes: number, userId: string, changeSummary: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const versionQuery = `
        INSERT INTO document_versions (tenant_id, document_id, version_string, s3_key, file_size_bytes, uploaded_by, change_summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, version_string as "versionString", s3_key as "s3Key", file_size_bytes as "fileSizeBytes"
      `;
      const versionRes = await client.query(versionQuery, [tenantId, documentId, versionString, s3Key, fileSizeBytes, userId, changeSummary]);
      const version = versionRes.rows[0];

      // Update parent document status to 'under_review'
      await client.query(
        `UPDATE documents SET status = 'under_review', updated_at = NOW() WHERE id = $1`,
        [documentId]
      );

      await client.query('COMMIT');
      return version;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async submitForApproval(tenantId: string, documentVersionId: string, approverId: string): Promise<any> {
    const query = `
      INSERT INTO approvals (tenant_id, document_version_id, approver_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id, status, approver_id as "approverId"
    `;
    const { rows } = await pool.query(query, [tenantId, documentVersionId, approverId]);
    return rows[0];
  }

  async decideApproval(tenantId: string, approvalId: string, approverId: string, decision: 'approved' | 'rejected', comments: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE approvals
        SET status = $1, comments = $2, decided_at = NOW()
        WHERE tenant_id = $3 AND id = $4 AND approver_id = $5 AND status = 'pending'
        RETURNING id, document_version_id as "versionId", status
      `;
      const res = await client.query(updateQuery, [decision, comments, tenantId, approvalId, approverId]);
      if (res.rows.length === 0) {
        throw new BadRequestError('Approval record not found or already decided');
      }

      const versionId = res.rows[0].versionId;

      if (decision === 'rejected') {
        // If rejected, set document status to 'draft' or 'rejected'
        await client.query(
          `UPDATE documents 
           SET status = 'draft' 
           WHERE id = (SELECT document_id FROM document_versions WHERE id = $1)`,
          [versionId]
        );
      } else {
        // Check if there are any other pending approvals for this version
        const pendingCheck = await client.query(
          `SELECT COUNT(*) as count FROM approvals WHERE document_version_id = $1 AND status = 'pending'`,
          [versionId]
        );
        const pendingCount = parseInt(pendingCheck.rows[0].count);

        if (pendingCount === 0) {
          // All approved! Set document status to 'approved'
          await client.query(
            `UPDATE documents 
             SET status = 'approved' 
             WHERE id = (SELECT document_id FROM document_versions WHERE id = $1)`,
            [versionId]
          );
        }
      }

      await client.query('COMMIT');
      return res.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // PROCUREMENT WORKFLOWS
  // ==========================================================================
  
  async createPR(tenantId: string, projectId: string, requesterId: string, prNumber: string, description: string, estimatedCost: number, requiredDate: Date): Promise<any> {
    const query = `
      INSERT INTO purchase_requisitions (tenant_id, project_id, requester_id, pr_number, description, estimated_cost, required_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING id, pr_number as "prNumber", status
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, requesterId, prNumber, description, estimatedCost, requiredDate]);
    return rows[0];
  }

  async createRFQ(tenantId: string, projectId: string, prId: string, rfqNumber: string, title: string, closingDate: Date): Promise<any> {
    const query = `
      INSERT INTO rfqs (tenant_id, project_id, pr_id, rfq_number, title, closing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING id, rfq_number as "rfqNumber", status
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, prId, rfqNumber, title, closingDate]);
    return rows[0];
  }

  async createPO(tenantId: string, projectId: string, rfqId: string, vendorId: string, poNumber: string, totalAmount: number, orderDate: Date): Promise<any> {
    const query = `
      INSERT INTO purchase_orders (tenant_id, project_id, rfq_id, vendor_id, po_number, total_amount, order_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING id, po_number as "poNumber", total_amount as "totalAmount", status
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, rfqId, vendorId, poNumber, totalAmount, orderDate]);
    return rows[0];
  }

  // ==========================================================================
  // QUALITY CONTROL & HSE
  // ==========================================================================
  
  async recordInspection(tenantId: string, projectId: string, inspectorId: string, inspectionDate: Date, areaInspected: string, checklist: any[], result: 'passed' | 'failed', notes: string): Promise<any> {
    const query = `
      INSERT INTO inspections (tenant_id, project_id, inspector_id, inspection_date, area_inspected, checklist, result, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, result, area_inspected as "areaInspected"
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, inspectorId, inspectionDate, areaInspected, JSON.stringify(checklist), result, notes]);
    return rows[0];
  }

  async raiseNCR(tenantId: string, projectId: string, inspectionId: string | null, issuedBy: string, assignedTo: string, description: string, targetDate: Date): Promise<any> {
    const query = `
      INSERT INTO ncrs (tenant_id, project_id, inspection_id, issued_by, assigned_to, description, target_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
      RETURNING id, status, description
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, inspectionId, issuedBy, assignedTo, description, targetDate]);
    return rows[0];
  }

  async logHSEIncident(tenantId: string, projectId: string, reporterId: string, incidentDate: Date, severity: string, description: string, location: string): Promise<any> {
    const query = `
      INSERT INTO incidents (tenant_id, project_id, reported_by, incident_date, severity, description, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'investigating')
      RETURNING id, severity, status
    `;
    const { rows } = await pool.query(query, [tenantId, projectId, reporterId, incidentDate, severity, description, location]);
    return rows[0];
  }
}
