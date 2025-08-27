import { NextFunction, Request, Response } from 'express';
import { verifyToken, generateToken } from '../../utils/token';
import config from '../../config';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';
import { Token } from '../../DB/models/token.model';

interface TokenUser {
  _id: string;
  email?: string;
  phone?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user: TokenUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // === 1. Get Tokens ===
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    // Express lowercases all headers
    const refreshToken =
      (req.headers['refresh-token'] as string) ||
      (req.headers['refreshtoken'] as string) ||
      (req.headers['x-refresh-token'] as string);

    if (!accessToken && !refreshToken) {
      throw new AppError(
        'Access denied. No authentication token provided.',
        401,
      );
    }

    // === 2. Validate Access Token ===
    if (accessToken) {
      try {
        const decoded: any = await verifyToken(accessToken);

        if (!decoded?._id) throw new AppError('Invalid access token', 401);

        // Optional: If you store access tokens in DB, validate them
        // const isTokenValid = await Token.exists({ token: accessToken, type: "access", blacklisted: false });
        // if (!isTokenValid) throw new AppError("Access token invalidated", 401);

        const user = await User.findById(decoded._id).select('-password');
        if (!user || user.isDeleted)
          throw new AppError('User not found or deleted', 404);

        if (
          user.credentialsUpdatedAt &&
          decoded.iat &&
          new Date(user.credentialsUpdatedAt).getTime() > decoded.iat * 1000
        ) {
          throw new AppError('Credentials updated, please log in again', 403);
        }
        if (!user._id) throw new AppError('User not found', 404);
        // Attach user to request
        req.user = {
          _id: user._id.toString(),
          email: user.email,
          phone: user.phone,
        };

        return next();
      } catch (e) {
        // Continue to refresh token if access token expired
      }
    }

    // === 3. Validate Refresh Token ===
    if (!refreshToken) throw new AppError('No refresh token provided', 401);

    const decodedRefresh: any = await verifyToken(refreshToken);
    if (!decodedRefresh?._id) throw new AppError('Invalid refresh token', 401);

    const isRefreshTokenValid = await Token.findOne({
      token: refreshToken,
      type: 'refresh',
    });

    if (!isRefreshTokenValid)
      throw new AppError('Refresh token invalidated', 401);

    const user = await User.findById(decodedRefresh._id).select('-password');
    if (!user || user.isDeleted)
      throw new AppError('User not found or deleted', 404);

    // === 4. Generate new tokens ===
    const newAccessToken = generateToken(
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
      token: newAccessToken, // Fix: Use newAccessToken instead of accessToken
      userId: user._id,
      type: 'access',
    });
    await Token.create({
      token: newRefreshToken,
      userId: user._id,
      type: 'refresh',
    });

    if (!user._id) throw new AppError('User not found', 404);
    // Attach user to request
    req.user = {
      _id: user._id.toString(),
      email: user.email,
      phone: user.phone,
    };

    // Send new tokens back in headers AND response body
    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
    res.setHeader('refreshToken', newRefreshToken);

    // Add this: Send tokens in response body for automatic token refresh
    res.locals.newTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };

    return next();
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError('Authentication failed', 401),
    );
  }
};
