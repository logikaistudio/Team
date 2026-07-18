import { Router, Request, Response, NextFunction } from 'express';
import { ProjectRepository } from '../repositories/project.repository';
import { authenticate } from '../middlewares/auth';
import { projectSchema, wbsNodeSchema, taskSchema } from '../utils/validation';
import { BadRequestError } from '../utils/errors';
import { documentRouter } from './document.controller';

export const projectRouter = Router();
const projectRepository = new ProjectRepository();
const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

projectRouter.use(authenticate);

// --- Sub-routers ---
projectRouter.use('/:projectId/documents', documentRouter);

// --- Projects ---
projectRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const defaultStartDate = now.toISOString().slice(0, 10);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    const defaultEndDate = defaultEnd.toISOString().slice(0, 10);

    const statusId = req.body?.statusId || (await projectRepository.ensureDefaultStatusId(tenantId));

    const payload = {
      ...req.body,
      statusId,
      startDate: req.body?.startDate || defaultStartDate,
      endDate: req.body?.endDate || defaultEndDate,
    };

    const check = projectSchema.safeParse(payload);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const project = await projectRepository.create(tenantId, check.data);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

projectRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const projects = await projectRepository.findAll(tenantId);
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

projectRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid project id format' });
    }
    const project = await projectRepository.findById(tenantId, req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

// Update project
projectRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid project id format' });
    }
    const check = projectSchema.partial().safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const updated = await projectRepository.update(tenantId, id, check.data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete project
projectRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid project id format' });
    }
    const ok = await projectRepository.delete(tenantId, id);
    if (!ok) return res.status(404).json({ message: 'Project not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// --- WBS ---
projectRouter.post('/wbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const check = wbsNodeSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const node = await projectRepository.createWBS(tenantId, check.data);
    res.status(201).json(node);
  } catch (error) {
    next(error);
  }
});

projectRouter.get('/:projectId/wbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    if (!isUuid(req.params.projectId)) {
      return res.status(400).json({ message: 'Invalid project id format' });
    }
    const nodes = await projectRepository.getWBSNodes(tenantId, req.params.projectId);
    res.json(nodes);
  } catch (error) {
    next(error);
  }
});

// Update WBS node
projectRouter.put('/wbs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid WBS id format' });
    }
    const check = wbsNodeSchema.partial().safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const updated = await projectRepository.updateWBS(tenantId, id, check.data);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete WBS node
projectRouter.delete('/wbs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid WBS id format' });
    }
    const ok = await projectRepository.deleteWBS(tenantId, id);
    if (!ok) return res.status(404).json({ message: 'WBS node not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// --- Tasks ---
projectRouter.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const check = taskSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const task = await projectRepository.createTask(tenantId, check.data);
    // Trigger auto rollup in background
    if (task.projectId) {
      projectRepository.recalculateProjectRollup(tenantId, task.projectId).catch(() => {});
    }
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

projectRouter.get('/:projectId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    if (!isUuid(req.params.projectId)) {
      return res.status(400).json({ message: 'Invalid project id format' });
    }
    const tasks = await projectRepository.getTasks(tenantId, req.params.projectId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Update task
projectRouter.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid task id format' });
    }
    const check = taskSchema.partial().safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }
    const updated = await projectRepository.updateTask(tenantId, id, check.data);
    // Trigger auto rollup in background
    if (updated.projectId) {
      projectRepository.recalculateProjectRollup(tenantId, updated.projectId).catch(() => {});
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete task
projectRouter.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = req.params.id;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Invalid task id format' });
    }
    // Find task first to get projectId for rollup
    const existing = await projectRepository.findTaskById(tenantId, id);
    const ok = await projectRepository.deleteTask(tenantId, id);
    if (!ok) return res.status(404).json({ message: 'Task not found' });
    // Trigger auto rollup in background
    if (existing?.projectId) {
      projectRepository.recalculateProjectRollup(tenantId, existing.projectId).catch(() => {});
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
