import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../utils/token';
import { Token } from '../DB/models/token.model';
import { User } from '../DB/models/user.model';
import config from '../config';

export const refreshTokenHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: 'No refresh token provided' });
  }

  // Verify token validity
  const decoded: any = await verifyToken(refreshToken).catch(() => null);
  if (!decoded) {
    // invalid or expired → logout everywhere
    await Token.deleteMany({ token: refreshToken });
    await User.updateOne(
      { refreshToken },
      { $unset: { refreshToken: '' }, credentialsUpdatedAt: new Date() },
    );
    return res
      .status(401)
      .json({ success: false, message: 'Invalid refresh token' });
  }

  // Ensure token exists in DB
  const existingToken = await Token.findOne({ token: refreshToken });
  if (!existingToken) {
    return res
      .status(401)
      .json({ success: false, message: 'Refresh token not found' });
  }

  // Generate new access + refresh tokens
  const accessToken = generateToken(
    { _id: decoded._id, email: decoded.email, phone: decoded.phone },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );

  const newRefreshToken = generateToken(
    { _id: decoded._id, email: decoded.email, phone: decoded.phone },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );

  // Update DB
  await Token.deleteMany({ token: refreshToken });
  await Token.create({ token: newRefreshToken, userId: decoded._id });
  await User.updateOne({ _id: decoded._id }, { refreshToken: newRefreshToken });

  // Send response with new tokens
  return res
    .cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })
    .json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken,
    });
};
