import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../utils/token';
import { generateToken } from '../../utils/token';
import config from '../../config';
import { AppError } from '../../utils/error/AppError';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    // Try verifying access token first
    if (accessToken) {
      const decoded = await verifyToken(accessToken);
      if (!decoded) {
        throw new AppError('Invalid access token', 401);
      }
      req.user = decoded;
      return next();
    }
  } catch (accessError) {
    // If access token is invalid or expired, try refresh
    if (!refreshToken) {
      return res
        .status(401)
        .send('Access token expired and no refresh token provided.');
    }

    try {
      const decodedRefresh = await verifyToken(refreshToken);

      if (!decodedRefresh || typeof decodedRefresh === 'string') {
        return res.status(403).send('Invalid refresh token.');
      }

      // Extract user from the decoded token
      const user =
        'user' in decodedRefresh ? decodedRefresh.user : decodedRefresh;

      // Define the expected user type from token
      interface TokenUser {
        _id: string;
        email?: string;
        phone?: string;
      }

      // Ensure we have a valid user object with _id
      const tokenUser = user as TokenUser;
      if (!tokenUser || typeof tokenUser !== 'object' || !tokenUser._id) {
        return res.status(403).send('Invalid user data in refresh token.');
      }

      // Create a properly typed user payload
      const userPayload: TokenUser = {
        _id: tokenUser._id,
      };
      
      // Add optional fields if they exist
      if ('email' in tokenUser) userPayload.email = tokenUser.email;
      if ('phone' in tokenUser) userPayload.phone = tokenUser.phone;

      const newAccessToken = generateToken(
        { user: userPayload },
        { expiresIn: config.ACCESS_TOKEN_TIME },
      );

      res.setHeader('x-access-token', newAccessToken);
      req.user = userPayload;
      return next();
    } catch (refreshError) {
      return res.status(403).send('Invalid or expired refresh token.');
    }
  }
};
