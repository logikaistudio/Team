import { Router, Request, Response, NextFunction } from 'express';
import { EnterpriseUseCase } from '../usecases/enterprise.usecase';
import { authenticate } from '../middlewares/auth';
import { BadRequestError } from '../utils/errors';

export const enterpriseRouter = Router();
const enterpriseUseCase = new EnterpriseUseCase();

enterpriseRouter.use(authenticate);

// --- Documents ---
enterpriseRouter.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId, title, docNumber, category } = req.body;
    if (!projectId || !title || !docNumber) {
      throw new BadRequestError('ProjectId, title, and docNumber are required');
    }
    const doc = await enterpriseUseCase.createDocument(tenantId, projectId, title, docNumber, category);
    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/documents/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { documentId, versionString, s3Key, fileSizeBytes, changeSummary } = req.body;
    if (!documentId || !versionString || !s3Key) {
      throw new BadRequestError('documentId, versionString, and s3Key are required');
    }
    const version = await enterpriseUseCase.uploadVersion(tenantId, documentId, versionString, s3Key, fileSizeBytes, userId, changeSummary);
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/documents/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentVersionId, approverId } = req.body;
    if (!documentVersionId || !approverId) {
      throw new BadRequestError('documentVersionId and approverId are required');
    }
    const approval = await enterpriseUseCase.submitForApproval(tenantId, documentVersionId, approverId);
    res.status(201).json(approval);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/documents/approvals/:id/decide', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const approverId = req.user!.id;
    const approvalId = req.params.id;
    const { decision, comments } = req.body;

    if (decision !== 'approved' && decision !== 'rejected') {
      throw new BadRequestError('Decision must be either approved or rejected');
    }

    const approval = await enterpriseUseCase.decideApproval(tenantId, approvalId, approverId, decision, comments || '');
    res.json(approval);
  } catch (error) {
    next(error);
  }
});

// --- Procurement ---
enterpriseRouter.post('/procurement/pr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const requesterId = req.user!.id;
    const { projectId, prNumber, description, estimatedCost, requiredDate } = req.body;
    const pr = await enterpriseUseCase.createPR(tenantId, projectId, requesterId, prNumber, description, estimatedCost, requiredDate);
    res.status(201).json(pr);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/procurement/rfq', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId, prId, rfqNumber, title, closingDate } = req.body;
    const rfq = await enterpriseUseCase.createRFQ(tenantId, projectId, prId, rfqNumber, title, closingDate);
    res.status(201).json(rfq);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/procurement/po', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId, rfqId, vendorId, poNumber, totalAmount, orderDate } = req.body;
    const po = await enterpriseUseCase.createPO(tenantId, projectId, rfqId, vendorId, poNumber, totalAmount, orderDate);
    res.status(201).json(po);
  } catch (error) {
    next(error);
  }
});

// --- Safety & Quality ---
enterpriseRouter.post('/quality/inspections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const inspectorId = req.user!.id;
    const { projectId, inspectionDate, areaInspected, checklist, result, notes } = req.body;
    const inspection = await enterpriseUseCase.recordInspection(tenantId, projectId, inspectorId, inspectionDate, areaInspected, checklist, result, notes);
    res.status(201).json(inspection);
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post('/hse/incidents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const reporterId = req.user!.id;
    const { projectId, incidentDate, severity, description, location } = req.body;
    const incident = await enterpriseUseCase.logHSEIncident(tenantId, projectId, reporterId, incidentDate, severity, description, location);
    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});
