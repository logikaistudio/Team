import { IDocumentRepository } from './document.repository.interface';
import { ProjectDocument } from '../types/document';
import { pool } from '../config/database';

export class DocumentRepository implements IDocumentRepository {
  async createDocument(document: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<ProjectDocument> {
    const query = `
      INSERT INTO documents (tenant_id, project_id, name, type, size, file_path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", name, type, size, file_path AS "filePath", uploaded_by AS "uploadedBy", created_at AS "createdAt"
    `;
    const values = [
      document.tenantId,
      document.projectId,
      document.name,
      document.type,
      document.size,
      document.filePath,
      document.uploadedBy
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getDocumentsByProject(tenantId: string, projectId: string): Promise<ProjectDocument[]> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", name, type, size, file_path AS "filePath", uploaded_by AS "uploadedBy", created_at AS "createdAt"
      FROM documents
      WHERE tenant_id = $1 AND project_id = $2
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [tenantId, projectId]);
    return rows;
  }

  async getDocumentById(tenantId: string, documentId: string): Promise<ProjectDocument | null> {
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", name, type, size, file_path AS "filePath", uploaded_by AS "uploadedBy", created_at AS "createdAt"
      FROM documents
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, documentId]);
    return rows[0] || null;
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    const query = `
      DELETE FROM documents
      WHERE tenant_id = $1 AND id = $2
    `;
    await pool.query(query, [tenantId, documentId]);
  }
}
