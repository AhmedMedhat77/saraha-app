import { Request, Response } from 'express';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';
import { generateToken, verifyToken } from '../../utils/token';
import config from '../../config';

export const uploadImage = async (req: Request, res: Response) => {
  const file = req.file;
  const { _id } = req.user!;
  console.log(file);
  if (!_id) {
    throw new AppError('User not authenticated or invalid user data', 401);
  }
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const user = await User.findOneAndUpdate(
    { _id },
    { $set: { avatar: file.path } },
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return res.status(200).json({ success: true, user });
};

export const logout = async (req: Request, res: Response) => {
  // Have to use cookeParser as middle ware in app controller
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const decoded = await verifyToken(refreshToken);

  if (!decoded) {
    throw new AppError('Invalid token', 401);
  }

  const user = await User.findById(decoded._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

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
