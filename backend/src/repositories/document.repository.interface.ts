import { ProjectDocument } from '../types/document';

export interface IDocumentRepository {
  createDocument(document: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<ProjectDocument>;
  getDocumentsByProject(tenantId: string, projectId: string): Promise<ProjectDocument[]>;
  getDocumentById(tenantId: string, documentId: string): Promise<ProjectDocument | null>;
  deleteDocument(tenantId: string, documentId: string): Promise<void>;
}
