export interface ProjectStatus {
  id: string;
  tenantId?: string;
  name: string;
  colorCode: string;
  isTerminal: boolean;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  statusId: string;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  location?: string;
  budget: number;
  currency: string;
  progressPercent?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectMember {
  id: string;
  tenantId: string;
  projectId: string;
  userId: string;
  roleId: string;
  joinedAt?: Date;
}

export interface WBSNode {
  id: string;
  tenantId: string;
  projectId: string;
  parentId?: string;
  code: string;
  name: string;
  description?: string;
  weight: number;
  progressPercent?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  wbsId: string;
  scheduleId: string;
  name: string;
  description?: string;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  durationDays: number;
  progressPercent: number;
  plannedCost: number;
  weight: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  createdAt?: Date;
  updatedAt?: Date;
}
