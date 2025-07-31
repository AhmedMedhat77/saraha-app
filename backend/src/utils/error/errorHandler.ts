import { NextFunction, Request, Response } from 'express';

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((error: any) => {
      next(error);
    });
  };
};
