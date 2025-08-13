import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

interface IFileUploadOptions {
  allowedTypes?: string[];
}

export const multerCloud = ({
  allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
}: IFileUploadOptions = {}) => {
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        ),
      );
    }
  };
  // Create uploads directory if it doesn't exist
  const storage = multer.diskStorage({});
  const upload = multer({ storage, fileFilter });

  return upload;
};
