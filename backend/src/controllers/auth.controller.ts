import { Router, Request, Response, NextFunction } from 'express';
import { AuthUseCase } from '../usecases/auth.usecase';
import { UserRepository } from '../repositories/user.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { registerSchema, loginSchema } from '../utils/validation';
import { BadRequestError } from '../utils/errors';

export const authRouter = Router();

const userRepository = new UserRepository();
const tenantRepository = new TenantRepository();
const authUseCase = new AuthUseCase(userRepository, tenantRepository);

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const check = registerSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const { tenantName, domainName, planCode, adminName, adminEmail, adminPassword } = check.data;
    const result = await authUseCase.register(
      tenantName,
      domainName,
      planCode,
      adminName,
      adminEmail,
      adminPassword
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const check = loginSchema.safeParse(req.body);
    if (!check.success) {
      throw new BadRequestError(check.error.errors.map((e) => e.message).join(', '));
    }

    const { tenantId, email, password } = check.data;
    const result = await authUseCase.login(tenantId, email, password);

    // Set refresh token in secure cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const tokens = await authUseCase.refreshToken(rToken);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});
