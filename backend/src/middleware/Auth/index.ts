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

export const AuthMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log('=== Auth Middleware Started ===');
    
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

    console.log('Access token provided:', !!accessToken);
    console.log('Refresh token provided:', !!refreshToken);

    if (!accessToken && !refreshToken) {
      throw new AppError(
        'Access denied. No authentication token provided.',
        401,
      );
    }

    // === 2. Validate Access Token ===
    if (accessToken) {
      try {
        console.log('Validating access token...');
        const decoded: any = await verifyToken(accessToken);

        if (!decoded?._id) {
          // Access token is invalid/expired, continue to refresh token flow
          console.log('Access token invalid/expired, proceeding to refresh flow');
        } else {
          console.log('Access token appears valid, checking DB...');
          // Access token is valid, check if it exists in DB
          const isAccessTokenValid = await Token.findOne({
            token: accessToken,
            type: 'access',
          });

          if (!isAccessTokenValid) {
            console.log('Access token not found in DB, proceeding to refresh flow');
          } else {
            console.log('Access token valid in DB, proceeding with user validation');
            // Access token is valid and exists in DB, proceed with user validation
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

            console.log('Access token validation successful, proceeding');
            return next();
          }
        }
      } catch (e) {
        // Continue to refresh token if access token validation fails
        console.log('Access token validation failed with error, proceeding to refresh:', e);
      }
    }

    // === 3. Validate Refresh Token ===
    if (!refreshToken) {
      console.log('No refresh token provided, authentication failed');
      throw new AppError('No refresh token provided', 401);
    }

    console.log('Attempting to refresh tokens...');
    const decodedRefresh: any = await verifyToken(refreshToken);
    if (!decodedRefresh?._id) throw new AppError('Invalid refresh token', 401);

    console.log('Refresh token validated, checking DB...');
    const isRefreshTokenValid = await Token.findOne({
      token: refreshToken,
      type: 'refresh',
    });

    if (!isRefreshTokenValid) {
      console.log('Refresh token not found in DB');
      throw new AppError('Refresh token invalidated', 401);
    }

    console.log('Refresh token valid in DB, finding user...');
    const user = await User.findById(decodedRefresh._id).select('-password');
    if (!user || user.isDeleted)
      throw new AppError('User not found or deleted', 404);

    console.log('User found, generating new tokens...');
    // === 4. Generate new tokens ===
    const newAccessToken = generateToken(
      { _id: user._id, email: user.email, phone: user.phone },
      { expiresIn: config.ACCESS_TOKEN_TIME },
    );

    // Only generate new refresh token if the current one is close to expiring
    // Check if refresh token expires in less than 1 day
    const refreshTokenExp = decodedRefresh.exp * 1000; // Convert to milliseconds
    const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;

    let newRefreshToken = refreshToken;
    let shouldReplaceRefreshToken = false;

    if (refreshTokenExp < oneDayFromNow) {
      newRefreshToken = generateToken(
        { _id: user._id, email: user.email, phone: user.phone },
        { expiresIn: config.REFRESH_TOKEN_TIME },
      );
      shouldReplaceRefreshToken = true;
    }

    // Store new access token
    await Token.create({
      token: newAccessToken,
      userId: user._id,
      type: 'access',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    });

    console.log('New access token stored in DB');

    // Only replace refresh token if necessary
    if (shouldReplaceRefreshToken) {
      console.log('Replacing refresh token...');
      // Delete old refresh token and create new one
      await Token.deleteOne({ token: refreshToken, type: 'refresh' });
      await Token.create({
        token: newRefreshToken,
        userId: user._id,
        type: 'refresh',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      console.log('Refresh token replaced');
    } else {
      console.log('Keeping existing refresh token');
    }

    if (!user._id) throw new AppError('User not found', 404);

    // Attach user to request
    req.user = {
      _id: user._id.toString(),
      email: user.email,
      phone: user.phone,
    };

    console.log('User attached to request, setting response headers...');

    // Send new tokens back in headers
    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
    if (shouldReplaceRefreshToken) {
      res.setHeader('refreshToken', newRefreshToken);
    }

    // Store new tokens in response locals for potential use
    res.locals.newTokens = {
      accessToken: newAccessToken,
      refreshToken: shouldReplaceRefreshToken ? newRefreshToken : refreshToken,
      tokenRefreshed: true,
    };

    console.log('=== Auth Middleware Completed Successfully ===');
    return next();
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError('Authentication failed', 401),
    );
  }
};
