import { NextFunction, Request, Response } from 'express';
import { verifyToken, generateToken } from '../../utils/token';
import config from '../../config';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';

interface TokenUser {
  _id: string;
  email?: string;
  phone?: string;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).send('Access denied. No token provided.');
    }

    // 1️⃣ Try Access Token First
    if (accessToken) {
      const decoded = await verifyToken(accessToken);
      if (typeof decoded === 'string' || !decoded) {
        throw new AppError('Invalid access token', 401);
      }

      const user = await User.findById(decoded._id);
      // if user not found or deleted
      if (!user || user.isDeleted) {
        throw new AppError('User not found', 404);
      }
      // if user credentials updated after access token issued
      if (
        user.credentialsUpdatedAt &&
        // time to mil seconds changed to date to validate probably
        user.credentialsUpdatedAt > new Date(decoded.iat! * 1000)
      ) {
        throw new AppError('User credentials updated', 403);
      }

      req.user = { _id: user._id, email: user.email, phone: user.phone };

      return next();
    }

    // 2️⃣ Fallback to Refresh Token
    if (!refreshToken) {
      return res
        .status(401)
        .send('Access token expired and no refresh token provided.');
    }

    try {
      const decodedRefresh = await verifyToken(refreshToken);

      if (typeof decodedRefresh === 'string' || !decodedRefresh) {
        return res.status(403).send('Invalid refresh token.');
      }

      const user: TokenUser =
        'user' in decodedRefresh
          ? (decodedRefresh.user as TokenUser)
          : (decodedRefresh as TokenUser);

      if (!user._id) {
        return res.status(403).send('Invalid user data in refresh token.');
      }

      // Generate a new access token
      const newAccessToken = generateToken(
        { user },
        { expiresIn: config.ACCESS_TOKEN_TIME },
      );

      res.setHeader('x-access-token', newAccessToken);
      req.user = user;

      return next();
    } catch (refreshError) {
      return res.status(403).send('Invalid or expired refresh token.');
    }
  } catch (err) {
    // ✅ Ensure no hanging requests
    return next(err);
  }
};
