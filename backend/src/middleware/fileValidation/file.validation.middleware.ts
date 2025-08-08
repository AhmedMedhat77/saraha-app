import { NextFunction, Request, Response } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../../utils/error/AppError';
import fs from 'fs/promises';

export const fileValidationMiddleware = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg'],
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      const { path: filePath, mimetype } = req.file;

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return next(new AppError('File not found', 404));
      }

      // Check MIME type
      if (!allowedTypes.includes(mimetype)) {
        // Clean up the uploaded file
        await fs.unlink(filePath).catch(console.error);
        return next(
          new AppError(
            `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
            400,
          ),
        );
      }

      // Verify file content
      const buffer = await fs.readFile(filePath);
      const type = await fileTypeFromBuffer(buffer);

      if (!type || !allowedTypes.includes(type.mime)) {
        // Clean up the uploaded file
        await fs.unlink(filePath).catch(console.error);
        return next(
          new AppError('File content does not match its extension', 400),
        );
      }

      // Attach file info to request for later use
      req.file.mimetype = type.mime; // Update with detected MIME type

      next();
    } catch (err) {
      if (req.file?.path) {
        // Clean up the uploaded file in case of any error
        await fs.unlink(req.file.path).catch(console.error);
      }

      if (err instanceof AppError) {
        return next(err);
      }

      next(new AppError('Error validating file', 500));
    }
  };
};
