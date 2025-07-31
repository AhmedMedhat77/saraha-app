import { NextFunction, Request, Response } from 'express';

export const errorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((error: any) => {
      return res.status(error.cause || 500).json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
    });
  };
};
