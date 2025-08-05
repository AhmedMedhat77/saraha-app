import { Request, Response } from 'express';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';

export const uploadImage = async (req: Request, res: Response) => {
  const file = req.file;
  const { _id } = req.user!;
  console.log(file)
  if (!_id) {
    throw new AppError('User not authenticated or invalid user data', 401);
  }
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const user = await User.findOneAndUpdate({_id}, {$set:{avatar:file.path}});

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return res.status(200).json({ success: true, user });

};
