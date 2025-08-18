import { NextFunction, Request, Response } from 'express';
import { refreshTokenHandler } from '../../handlers/refreshTokenHandler';

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    refreshTokenHandler(req, res);

    if (err.message.includes('jwt expired')) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else {
      throw err;
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
