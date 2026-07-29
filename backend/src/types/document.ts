export interface ProjectDocument {
  id: string;
  tenantId: string;
  projectId: string;
  folderId?: string | null;
  name: string;
  type: string;
  size: number;
  filePath: string;
  uploadedBy: string;
  fileData?: Buffer;
  title?: string;
  docNumber?: string;
  category?: string;
  status?: string;
  createdAt: Date;
}

export interface DocumentFolder {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  parentId?: string | null;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}
