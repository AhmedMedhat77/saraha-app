import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { AppError } from '../../utils/error/AppError';

// without express 5 need to use this middleware  or try catch
export const isValid = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let validate = { ...req.query, ...req.body, ...req.params };
    const { error } = schema.validate(validate, {
      abortEarly: false,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => detail.message);
      const messages = errorDetails.join(', ');
      throw new AppError(messages, 400);
    }

    next();
  };
};
