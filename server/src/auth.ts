import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';

import { User } from './db.js';
import { HttpError } from './errors.js';

const TOKEN_TTL = '90d';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function signToken(userId: string, secret: string) {
  return jwt.sign({}, secret, { subject: userId, expiresIn: TOKEN_TTL, algorithm: 'HS256' });
}

export async function createAnonymousUser(secret: string) {
  const user = await User.create({ kind: 'anonymous' });
  const userId = user._id.toString();
  return { userId, token: signToken(userId, secret) };
}

export function requireAuth(secret: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new HttpError(401, 'Missing token'));
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
      const userId = typeof payload === 'object' ? payload.sub : undefined;
      if (!userId || !isValidObjectId(userId) || !(await User.exists({ _id: userId }))) {
        return next(new HttpError(401, 'Invalid token'));
      }
      req.userId = userId;
      next();
    } catch {
      next(new HttpError(401, 'Invalid token'));
    }
  };
}
