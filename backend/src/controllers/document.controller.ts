import { Router, Request, Response, NextFunction } from 'express';
import { DocumentRepository } from '../repositories/document.repository';
import { authenticate } from '../middlewares/auth';
// @ts-ignore
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const documentRouter = Router({ mergeParams: true });
const documentRepository = new DocumentRepository();

const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const upload = multer({ storage: multer.memoryStorage() });

documentRouter.use(authenticate);

// Get all documents for a project
documentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId } = req.params;
    const documents = await documentRepository.getDocumentsByProject(tenantId, projectId);
    res.json(
      documents.map((doc) => ({
        ...doc,
        filePath: `/api/projects/${projectId}/documents/${doc.id}/download`,
      }))
    );
  } catch (error) {
    next(error);
  }
});

documentRouter.get('/:documentId/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentId } = req.params;

    const doc = await documentRepository.getDocumentBinaryById(tenantId, documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.fileData) {
      res.setHeader('Content-Type', doc.type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
      return res.send(doc.fileData);
    }

    const fullPath = path.join(__dirname, '../..', doc.filePath);
    if (fs.existsSync(fullPath)) {
      return res.download(fullPath, doc.name);
    }

    return res.status(404).json({ error: 'Document file is missing' });
  } catch (error) {
    next(error);
  }
});

// Upload a document
documentRouter.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId } = req.params;
    const userId = (req as any).user?.id || req.tenantId; // fallback
    const file = (req as any).file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let filePath = '';
    if (!isVercelRuntime) {
      const uploadPath = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}-${file.originalname}`;
      fs.writeFileSync(path.join(uploadPath, fileName), file.buffer);
      filePath = `/uploads/${fileName}`;
    }

    const documentData = {
      tenantId,
      projectId,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      filePath,
      uploadedBy: userId,
      fileData: file.buffer,
    };

    const document = await documentRepository.createDocument(documentData);
    res.status(201).json({
      ...document,
      filePath: `/api/projects/${projectId}/documents/${document.id}/download`,
    });
  } catch (error) {
    next(error);
  }
});

// Delete a document
documentRouter.delete('/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { documentId } = req.params;
    
    const doc = await documentRepository.getDocumentById(tenantId, documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete file from filesystem (legacy local uploads)
    if (doc.filePath && doc.filePath.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, '../..', doc.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    await documentRepository.deleteDocument(tenantId, documentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
