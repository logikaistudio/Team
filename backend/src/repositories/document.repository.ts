import { IDocumentRepository } from './document.repository.interface';
import { DocumentFolder, ProjectDocument } from '../types/document';
import { pool } from '../config/database';

export class DocumentRepository implements IDocumentRepository {
  private static schemaReady = false;

  async ensureDocumentStorageSchema(): Promise<void> {
    if (DocumentRepository.schemaReady) return;

    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Ensure folder table exists.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_folders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        parent_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure file-storage columns exist on documents table, while keeping compatibility
    // with the older document-control schema (title/doc_number/category/status).
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS type VARCHAR(100)`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS size INTEGER`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path VARCHAR(500)`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA`);
    await pool.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL`);

    // Backfill minimal values for existing rows.
    await pool.query(`
      UPDATE documents
      SET name = COALESCE(name, title, doc_number, 'Untitled Document')
      WHERE name IS NULL
    `);
    await pool.query(`
      UPDATE documents
      SET type = COALESCE(type, 'application/octet-stream')
      WHERE type IS NULL
    `);
    await pool.query(`
      UPDATE documents
      SET size = COALESCE(size, 0)
      WHERE size IS NULL
    `);
    await pool.query(`
      UPDATE documents
      SET file_path = COALESCE(file_path, '')
      WHERE file_path IS NULL
    `);

    DocumentRepository.schemaReady = true;
  }

  async createDocument(document: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<ProjectDocument> {
    await this.ensureDocumentStorageSchema();
    const query = `
      INSERT INTO documents (tenant_id, project_id, folder_id, name, type, size, file_path, uploaded_by, file_data, title, doc_number, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, $4), COALESCE($11, $4), $12, COALESCE($13, 'approved'))
      RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", folder_id AS "folderId", name, type, size,
                file_path AS "filePath", uploaded_by AS "uploadedBy", created_at AS "createdAt"
    `;
    const values = [
      document.tenantId,
      document.projectId,
      document.folderId || null,
      document.name,
      document.type,
      document.size,
      document.filePath,
      document.uploadedBy,
      document.fileData || null,
      document.title || null,
      document.docNumber || null,
      document.category || 'General',
      document.status || 'approved',
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async getDocumentsByProject(tenantId: string, projectId: string, folderId?: string | null): Promise<ProjectDocument[]> {
    await this.ensureDocumentStorageSchema();
    const folderFilter = folderId === undefined
      ? ''
      : folderId === null
        ? ' AND d.folder_id IS NULL '
        : ' AND d.folder_id = $3 ';

    const query = `
      SELECT d.id,
             d.tenant_id AS "tenantId",
             d.project_id AS "projectId",
             d.folder_id AS "folderId",
             COALESCE(d.name, d.title, d.doc_number, 'Untitled Document') AS name,
             COALESCE(d.type, 'application/octet-stream') AS type,
             COALESCE(d.size, 0) AS size,
             COALESCE(d.file_path, '') AS "filePath",
             d.uploaded_by AS "uploadedBy",
             d.created_at AS "createdAt"
      FROM documents d
      WHERE d.tenant_id = $1 AND d.project_id = $2
      ${folderFilter}
      ORDER BY d.created_at DESC
    `;
    const params = folderId === undefined ? [tenantId, projectId] : [tenantId, projectId, folderId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async getDocumentById(tenantId: string, documentId: string): Promise<ProjectDocument | null> {
    await this.ensureDocumentStorageSchema();
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", folder_id AS "folderId",
             COALESCE(name, title, doc_number, 'Untitled Document') AS name,
             COALESCE(type, 'application/octet-stream') AS type,
             COALESCE(size, 0) AS size,
             COALESCE(file_path, '') AS "filePath",
             uploaded_by AS "uploadedBy", created_at AS "createdAt"
      FROM documents
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, documentId]);
    return rows[0] || null;
  }

  async getDocumentBinaryById(tenantId: string, documentId: string): Promise<ProjectDocument | null> {
    await this.ensureDocumentStorageSchema();
    const query = `
      SELECT id, tenant_id AS "tenantId", project_id AS "projectId", folder_id AS "folderId",
             COALESCE(name, title, doc_number, 'Untitled Document') AS name,
             COALESCE(type, 'application/octet-stream') AS type,
             COALESCE(size, 0) AS size,
             COALESCE(file_path, '') AS "filePath",
             uploaded_by AS "uploadedBy", file_data AS "fileData", created_at AS "createdAt"
      FROM documents
      WHERE tenant_id = $1 AND id = $2
    `;
    const { rows } = await pool.query(query, [tenantId, documentId]);
    return rows[0] || null;
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    await this.ensureDocumentStorageSchema();
    const query = `
      DELETE FROM documents
      WHERE tenant_id = $1 AND id = $2
    `;
    await pool.query(query, [tenantId, documentId]);
  }

  async listFolders(tenantId: string, projectId: string): Promise<DocumentFolder[]> {
    await this.ensureDocumentStorageSchema();
    const { rows } = await pool.query(
      `SELECT id, tenant_id AS "tenantId", project_id AS "projectId", name, parent_id AS "parentId",
              created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM document_folders
       WHERE tenant_id = $1 AND project_id = $2
       ORDER BY created_at ASC`,
      [tenantId, projectId]
    );
    return rows;
  }

  async createFolder(folder: Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentFolder> {
    await this.ensureDocumentStorageSchema();
    const { rows } = await pool.query(
      `INSERT INTO document_folders (tenant_id, project_id, name, parent_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", name, parent_id AS "parentId",
                 created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [folder.tenantId, folder.projectId, folder.name, folder.parentId || null, folder.createdBy || null]
    );
    return rows[0];
  }

  async updateFolderName(tenantId: string, folderId: string, name: string): Promise<DocumentFolder | null> {
    await this.ensureDocumentStorageSchema();
    const { rows } = await pool.query(
      `UPDATE document_folders
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $2 AND id = $3
       RETURNING id, tenant_id AS "tenantId", project_id AS "projectId", name, parent_id AS "parentId",
                 created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name, tenantId, folderId]
    );
    return rows[0] || null;
  }

  async deleteFolder(tenantId: string, folderId: string): Promise<void> {
    await this.ensureDocumentStorageSchema();
    await pool.query(`UPDATE documents SET folder_id = NULL WHERE tenant_id = $1 AND folder_id = $2`, [tenantId, folderId]);
    await pool.query(`UPDATE document_folders SET parent_id = NULL WHERE tenant_id = $1 AND parent_id = $2`, [tenantId, folderId]);
    await pool.query(`DELETE FROM document_folders WHERE tenant_id = $1 AND id = $2`, [tenantId, folderId]);
  }
}
