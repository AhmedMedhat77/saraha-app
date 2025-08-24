import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../utils/token';
import { Token } from '../DB/models/token.model';
import { User } from '../DB/models/user.model';
import config from '../config';
import { AppError } from '../utils/error/AppError';

export const refreshTokenHandler = async (req: Request, res: Response) => {
  const refreshToken =
    (req.headers['refreshtoken'] as string) ||
    (req.headers['refresh-token'] as string);

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token provided',
    });
  }

  try {
    // Verify token validity
    const decoded = await verifyToken(refreshToken);

    if (!decoded || typeof decoded === 'string' || !decoded._id) {
      throw new Error('Invalid refresh token');
    }

    // Ensure token exists in DB and is not blacklisted
    const existingToken = await Token.findOne({
      token: refreshToken,
      type: 'refresh',
    });

    if (!existingToken) {
      await Token.deleteMany({ token: refreshToken });
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found or invalidated',
      });
    }

    // Generate new tokens
    const user = await User.findById(decoded._id);
    if (!user || user.isDeleted) {
      throw new AppError('User not found or account deleted', 404);
    }

    const accessToken = generateToken(
      { _id: user._id, email: user.email, phone: user.phone },
      { expiresIn: config.ACCESS_TOKEN_TIME },
    );

    const newRefreshToken = generateToken(
      { _id: user._id, email: user.email, phone: user.phone },
      { expiresIn: config.REFRESH_TOKEN_TIME },
    );

    // Update tokens in DB
    await Token.deleteMany({
      $or: [{ token: refreshToken }, { userId: user._id, type: 'refresh' }],
    });

    await Token.create({
      token: newRefreshToken,
      userId: user._id,
      type: 'refresh',
    });

    // Send response
    return res.json({
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
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};
