import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import config from '../../config';

export const defaultFolder = (userId: string, folderName?: string) => {
  return `saraha-app/users/user/${userId}${folderName ? `/${folderName}` : ''}`;
};

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

// --- Multer Storage (for Express middleware) ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: 'uploads',
    resource_type: 'auto',
    public_id: `${Date.now()}-${file.originalname}`,
  }),
});

export const upload = multer({ storage });

// --- Utility functions (programmatic usage) ---
export const fileUpload = async (file: string, options = {}) =>
  await cloudinary.uploader.upload(file, options);

export const filesUpload = async (files: string[], options = {}) => {
  const results: { public_id: string; secure_url: string }[] = [];
  for (const file of files) {
    const result = await cloudinary.uploader.upload(file, options);
    results.push({
      public_id: result.public_id,
      secure_url: result.secure_url,
    });
  }
  return results;
};

export const createFolder = async (userId: string, folderName?: string) => {
  await cloudinary.api.create_folder(defaultFolder(userId, folderName));
};

export const deleteFile = async (public_id: string) =>
  await cloudinary.uploader.destroy(public_id);

export const deleteFiles = async (public_ids: string[]) => {
  for (const public_id of public_ids) {
    await cloudinary.uploader.destroy(public_id);
  }
};

export default cloudinary;
