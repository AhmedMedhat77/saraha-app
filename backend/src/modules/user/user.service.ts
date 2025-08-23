import { Request, Response } from 'express';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';
import { generateToken, verifyToken } from '../../utils/token';
import config from '../../config';
import fs from 'fs/promises';
import path from 'path';
import { successResponse } from '../../utils/response';
import cloudinary, { defaultFolder } from '../../utils/cloud/cloudinary.config';

export const uploadImage = async (req: Request, res: Response) => {
  const file = req.file;
  const { _id } = req.user;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  try {
    // Find user and get old image path if exists
    const user = await User.findById(_id);
    if (!user) {
      await fs.unlink(file.path).catch(console.error);
      throw new AppError('User not found', 404);
    }

    // Delete old image if exists
    if (user.avatar) {
      const oldImagePath = path.join(process.cwd(), user.avatar);
      try {
        await fs.access(oldImagePath);
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.error('Error deleting old image:', err);
        // Continue even if old image deletion fails
      }
    }

    // Update user with new image path (relative to project root)
    const relativePath = path.relative(process.cwd(), file.path);
    user.avatar = relativePath;
    await user.save();

    return res.status(200).json({ success: true, user });
  } catch (error) {
    // Clean up the uploaded file in case of error
    if (file?.path) {
      await fs.unlink(file.path).catch(console.error);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Error uploading image', 500);
  }
};

// upload image to cloud
/*
1- get image from req.file
2- delete old one if exists (make file for first time only )
2.1- if image exists always make image with same public_id 
3- upload new one 
*/

export const uploadImageToCloud = async (req: Request, res: Response) => {
  const file = req.file;
  const { _id } = req.user;

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }
  const user = await User.findById(_id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let options: { folder?: string; public_id?: string } = {
    folder: defaultFolder(_id, 'profilePic'),
    public_id: user.cloudinaryAvatar?.public_id,
  };

  if (user.cloudinaryAvatar?.public_id) {
    delete options.folder;
  }
  const result = await cloudinary.uploader.upload(file.path, options);

  user.cloudinaryAvatar = {
    public_id: result.public_id,
    secure_url: result.secure_url,
  };

  await user.save();

  successResponse(res, {
    data: user,
    statusCode: 200,
    message: 'Image uploaded successfully',
  });
};

export const logout = async (req: Request, res: Response) => {
  // Have to use cookeParser as middle ware in app controller
  const { refreshToken } = req.cookies;

  const decoded = await verifyToken(refreshToken);

  if (!decoded) {
    throw new AppError('Invalid token', 401);
  }

  const user = await User.findById(decoded._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.refreshToken = '';

  //  for now i use refresh token in cookie only not saved in DB
  // user.refreshToken = undefined;
  // await user.save();

  return res
    .status(200)
    .cookie('refreshToken', '', { httpOnly: true })
    .json({ success: true, message: 'User logged out' });
};

// Generate new access token by getting refresh token
export const generateNewAccessToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  const decoded = await verifyToken(refreshToken);
  const user = await User.findById(decoded?._id);

  if (!user) {
    throw new AppError('user not found ', 401);
  }

  const accessToken = generateToken(
    { _id: user._id, email: user.email, phone: user.phone },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );

  return res.status(200).json({ success: true, accessToken });
};
