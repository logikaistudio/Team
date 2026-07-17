export interface ProjectDocument {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  filePath: string;
  uploadedBy: string;
  createdAt: Date;
}
