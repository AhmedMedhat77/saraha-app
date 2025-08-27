import { Request, Response, NextFunction } from 'express';
import { generateToken, verifyToken } from '../utils/token';
import { Token } from '../DB/models/token.model';
import { User } from '../DB/models/user.model';
import config from '../config';
import { AppError } from '../utils/error/AppError';

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken =
      (req.headers['x-refresh-token'] as string) ||
      (req.headers['refresh-token'] as string) ||
      (req.headers['refreshtoken'] as string);

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401);
    }

    // Verify token validity
    const decoded: any = await verifyToken(refreshToken);
    if (!decoded || typeof decoded === 'string' || !decoded._id) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Ensure token exists in DB and is not blacklisted
    const existingToken = await Token.findOne({
      token: refreshToken,
      type: 'refresh',
    });

    if (!existingToken) {
      await Token.deleteMany({ token: refreshToken });
      throw new AppError('Refresh token not found or invalidated', 401);
    }

    // Find user
    const user = await User.findById(decoded._id);
    if (!user || user.isDeleted) {
      throw new AppError('User not found or account deleted', 404);
    }

    // Generate new tokens
    const accessToken = generateToken(
      { _id: user._id, email: user.email, phone: user.phone },
      { expiresIn: config.ACCESS_TOKEN_TIME },
    );

    const newRefreshToken = generateToken(
      { _id: user._id, email: user.email, phone: user.phone },
      { expiresIn: config.REFRESH_TOKEN_TIME },
    );

    // Replace old refresh tokens
    await Token.deleteMany({
      $or: [{ token: refreshToken }, { userId: user._id, type: 'refresh' }],
    });

    await Token.create({
      token: newRefreshToken,
      userId: user._id,
      type: 'refresh',
    });

    // Success response
    return res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Invalid or expired refresh token', 401),
    );
  }
};