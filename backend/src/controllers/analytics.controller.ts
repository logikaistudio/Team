import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsUseCase } from '../usecases/analytics.usecase';
import { authenticate } from '../middlewares/auth';
import { BadRequestError } from '../utils/errors';

export const analyticsRouter = Router();
const analyticsUseCase = new AnalyticsUseCase();

analyticsRouter.use(authenticate);

analyticsRouter.get('/:projectId/evm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const projectId = req.params.projectId;
    const dateStr = req.query.date as string || new Date().toISOString();
    const upToDate = new Date(dateStr);

    if (isNaN(upToDate.getTime())) {
      throw new BadRequestError('Invalid date format');
    }

    const evm = await analyticsUseCase.calculateEVM(tenantId, projectId, upToDate);
    res.json(evm);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/:projectId/s-curve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const projectId = req.params.projectId;
    const sCurve = await analyticsUseCase.generateSCurve(tenantId, projectId);
    res.json(sCurve);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/:projectId/health-score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const projectId = req.params.projectId;
    const health = await analyticsUseCase.calculateHealthScore(tenantId, projectId);
    res.json(health);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/:projectId/ai-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const projectId = req.params.projectId;
    const type = (req.body.type as 'weekly' | 'monthly' | 'forecast') || 'forecast';

    const aiSummary = await analyticsUseCase.generateAIReportSummary(tenantId, projectId, type);
    res.json({ aiSummary });
  } catch (error) {
    next(error);
  }
});
