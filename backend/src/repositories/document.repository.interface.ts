import { DocumentFolder, ProjectDocument } from '../types/document';

export interface IDocumentRepository {
  ensureDocumentStorageSchema(): Promise<void>;
  createDocument(document: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<ProjectDocument>;
  getDocumentsByProject(tenantId: string, projectId: string, folderId?: string | null): Promise<ProjectDocument[]>;
  getDocumentById(tenantId: string, documentId: string): Promise<ProjectDocument | null>;
  getDocumentBinaryById(tenantId: string, documentId: string): Promise<ProjectDocument | null>;
  deleteDocument(tenantId: string, documentId: string): Promise<void>;
  listFolders(tenantId: string, projectId: string): Promise<DocumentFolder[]>;
  createFolder(folder: Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentFolder>;
  updateFolderName(tenantId: string, folderId: string, name: string): Promise<DocumentFolder | null>;
  deleteFolder(tenantId: string, folderId: string): Promise<void>;
}
