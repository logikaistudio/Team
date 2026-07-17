import { Router, Request, Response, NextFunction } from 'express';
import { DocumentRepository } from '../repositories/document.repository';
import { authenticate } from '../middlewares/auth';
// @ts-ignore
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const documentRouter = Router({ mergeParams: true });
const documentRepository = new DocumentRepository();

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

documentRouter.use(authenticate);

// Get all documents for a project
documentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId } = req.params;
    const documents = await documentRepository.getDocumentsByProject(tenantId, projectId);
    res.json(documents);
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

    const documentData = {
      tenantId,
      projectId,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      filePath: `/uploads/${file.filename}`,
      uploadedBy: userId
    };

    const document = await documentRepository.createDocument(documentData);
    res.status(201).json(document);
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
    
    // Delete file from filesystem
    const fullPath = path.join(__dirname, '../..', doc.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    await documentRepository.deleteDocument(tenantId, documentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
