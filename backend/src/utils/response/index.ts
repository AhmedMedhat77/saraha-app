import { Response } from 'express';

export const statusCodes = {
  success: 200,
  created: 201,
  noContent: 204,
  notFound: 404,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  serverError: 500,
};

interface SuccessOptions {
  statusCode?: number;
  message?: string;
  data?: any;
  meta?: Record<string, any>;
}

interface ErrorOptions {
  statusCode?: number;
  message?: string;
  errors?: any;
}

/**
 * Send a standardized success response
 */
export const successResponse = (
  res: Response,
  { statusCode = statusCodes.success, message = 'Success', data = null, meta }: SuccessOptions,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
};

/**
 * Send a standardized error response
 */
export const errorResponse = (
  res: Response,
  { statusCode = statusCodes.serverError, message = 'Something went wrong', errors }: ErrorOptions,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};
