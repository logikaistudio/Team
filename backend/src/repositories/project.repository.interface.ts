import { Project, ProjectStatus, ProjectMember, WBSNode, Task } from '../domain/project.entity';

export interface IProjectRepository {
  // Project CRUD
  create(tenantId: string, project: Partial<Project>): Promise<Project>;
  findById(tenantId: string, id: string): Promise<Project | null>;
  findByCode(tenantId: string, code: string): Promise<Project | null>;
  findAll(tenantId: string): Promise<Project[]>;
  update(tenantId: string, id: string, project: Partial<Project>): Promise<Project>;
  delete(tenantId: string, id: string): Promise<boolean>;

  // Project Members
  addMember(tenantId: string, member: Partial<ProjectMember>): Promise<ProjectMember>;
  getMembers(tenantId: string, projectId: string): Promise<ProjectMember[]>;
  removeMember(tenantId: string, projectId: string, userId: string): Promise<boolean>;

  // WBS CRUD
  createWBS(tenantId: string, node: Partial<WBSNode>): Promise<WBSNode>;
  getWBSNodes(tenantId: string, projectId: string): Promise<WBSNode[]>;
  findWBSById(tenantId: string, id: string): Promise<WBSNode | null>;
  updateWBS(tenantId: string, id: string, node: Partial<WBSNode>): Promise<WBSNode>;
  deleteWBS(tenantId: string, id: string): Promise<boolean>;

  // Tasks CRUD
  createTask(tenantId: string, task: Partial<Task>): Promise<Task>;
  getTasks(tenantId: string, projectId: string): Promise<Task[]>;
  findTaskById(tenantId: string, id: string): Promise<Task | null>;
  updateTask(tenantId: string, id: string, task: Partial<Task>): Promise<Task>;
  deleteTask(tenantId: string, id: string): Promise<boolean>;

  // Roll-up
  recalculateProjectRollup(tenantId: string, projectId: string): Promise<void>;
}
