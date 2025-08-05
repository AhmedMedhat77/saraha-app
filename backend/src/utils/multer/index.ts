import { nanoid } from 'nanoid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// Utility to create multer upload middleware
export const uploadMulter = () => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Save to /uploads folder relative to the project root
      fs.mkdirSync(path.join(__dirname, '../../../uploads'), { recursive: true });
      cb(null, path.join(__dirname, '../../../uploads'));
    },

    filename: function (req, file, cb) {
      const uniqueSuffix = nanoid();
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({ storage });
  return upload;
};
