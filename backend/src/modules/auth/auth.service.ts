// Dependencies
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';

// Models
import { User } from '../../DB/models/user.model';
import { Token } from '../../DB/models/token.model';

// Utils
import { AppError } from '../../utils/error/AppError';
import { generateOTP } from '../../utils/otp';
import { sendEmail } from '../../utils/email';
import { generateToken, verifyToken } from '../../utils/token';
import { successResponse } from '../../utils/response';
import cloudinary from '../../utils/cloud/cloudinary.config';
import { comparePassword, hashPassword } from '../../utils/hash';

// Constants
import config from '../../config';

// Types
interface AuthUser {
  _id: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  platform: 'local' | 'google';
  isVerified: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<AuthUser>;
}

// Constants
const OTP_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_BLOCK_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Generate and store tokens for user
 */
const generateUserTokens = async (user: any): Promise<TokenResponse> => {
  const accessToken = generateToken(
    { _id: user._id },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );

  const refreshToken = generateToken(
    { _id: user._id, email: user.email, phone: user.phone },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );

  // Store tokens in database
  await Promise.all([
    Token.create({
      token: accessToken,
      userId: user._id,
      type: 'access',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      deviceInfo: {
        userAgent: 'unknown',
        ip: 'unknown',
        deviceId: 'unknown',
      },
    }),
    Token.create({
      token: refreshToken,
      userId: user._id,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      deviceInfo: {
        userAgent: 'unknown',
        ip: 'unknown',
        deviceId: 'unknown',
      },
    }),
  ]);

  // Update user's last login
  user.lastLoginAt = new Date();
  user.loginAttempts = 0;
  user.isLocked = false;
  user.lockedUntil = null;
  await user.save();

  const { password, otp, otpExpiry, resetToken, ...userResponse } =
    user.toObject();

  return {
    accessToken,
    refreshToken,
    user: userResponse,
  };
};

/**
 * Check if user is blocked from OTP attempts
 */
const isUserBlocked = (user: any): boolean => {
  if (!user.OtpBlockTime) return false;
  return new Date(user.OtpBlockTime) > new Date();
};

/**
 * Check if user is locked from login attempts
 */
const isUserLocked = (user: any): boolean => {
  if (!user.isLocked || !user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
};

/**
 * Block user for OTP attempts
 */
const blockUserOTP = async (user: any): Promise<void> => {
  user.OtpBlockTime = new Date(Date.now() + OTP_BLOCK_TIME);
  await user.save();
};

/**
 * Lock user for login attempts
 */
const lockUser = async (user: any): Promise<void> => {
  user.isLocked = true;
  user.lockedUntil = new Date(Date.now() + LOGIN_BLOCK_TIME);
  await user.save();
};

/**
 * Register new user
 */
export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, dob, phone, platform } =
    req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
  });

  if (existingUser?.isVerified) {
    throw new AppError('User already exists and is verified', 409);
  }

  const { otp, otpExpiry } = generateOTP(6, OTP_EXPIRY_TIME);

  if (existingUser && !existingUser.isVerified) {
    // Update existing unverified user
    existingUser.otp = otp;
    existingUser.otpExpiry = otpExpiry;
    existingUser.otpAttempts = 0;
    existingUser.OtpBlockTime = null;
    await existingUser.save();

    // Send OTP email
    if (existingUser.email) {
      await sendEmail({
        to: existingUser.email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp} and expires in ${OTP_EXPIRY_TIME / 60000} minutes`,
      });
    }

    return successResponse(res, {
      message: 'OTP sent to your email',
      statusCode: 200,
    });
  }

  // Create new user
  const hashedPassword =
    platform === 'local' ? await hashPassword(password) : undefined;

  const newUser = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    dob,
    phone,
    platform,
    otp,
    otpExpiry,
  });

  await newUser.save();

  // Send OTP email
  if (newUser.email) {
    await sendEmail({
      to: newUser.email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp} and expires in ${OTP_EXPIRY_TIME / 60000} minutes`,
    });
  }

  return successResponse(res, {
    message: 'User registered successfully. OTP sent to email.',
    statusCode: 201,
    data: { userId: newUser._id },
  });
};

/**
 * Register with Google
 */
export const registerWithGoogle = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  const oauth2Client = new OAuth2Client();
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new AppError('Invalid Google token', 401);
  }

  const { email, name, picture, sub: googleId } = payload;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 409);
  }

  // Create new Google user
  const newUser = new User({
    email,
    firstName: name?.split(' ')[0] || 'Google',
    lastName: name?.split(' ').slice(1).join(' ') || 'User',
    avatar: picture,
    platform: 'google',
    googleId,
    isVerified: true,
  });

  await newUser.save();

  // Generate tokens
  const tokens = await generateUserTokens(newUser);

  return successResponse(res, {
    message: 'User registered successfully with Google',
    statusCode: 201,
    data: tokens,
  });
};

/**
 * Verify account with OTP
 */
export const verifyAccount = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('User is already verified', 409);
  }

  if (!user.otp || !user.otpExpiry) {
    throw new AppError('No OTP associated with this user', 409);
  }

  // Check if user is blocked
  if (isUserBlocked(user)) {
    throw new AppError('Too many OTP attempts. Try again later.', 429);
  }

  // Check OTP expiry
  if (new Date(user.otpExpiry) < new Date()) {
    throw new AppError('OTP has expired', 401);
  }

  // Check OTP match
  if (user.otp !== otp) {
    user.otpAttempts += 1;

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await blockUserOTP(user);
    }

    await user.save();
    throw new AppError('Invalid OTP', 401);
  }

  // OTP is correct - verify user
  user.isVerified = true;
  user.otpAttempts = 0;
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.OtpBlockTime = null;

  await user.save();

  // Create cloudinary folder
  try {
    await cloudinary.api.create_folder(`saraha-app/user/${user._id}`);
  } catch (error) {
    console.error('Failed to create cloudinary folder:', error);
  }

  return successResponse(res, {
    message: 'User verified successfully',
    statusCode: 200,
  });
};

/**
 * Resend OTP
 */
export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('User is already verified', 409);
  }

  // Check if user is blocked
  if (isUserBlocked(user)) {
    throw new AppError('Too many OTP attempts. Try again later.', 429);
  }

  // Generate new OTP
  const { otp, otpExpiry } = generateOTP(6, OTP_EXPIRY_TIME);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  user.OtpBlockTime = null;
  await user.save();

  // Send OTP email
  await sendEmail({
    to: user.email!,
    subject: 'OTP Verification',
    text: `Your new OTP is ${otp} and expires in ${OTP_EXPIRY_TIME / 60000} minutes`,
  });

  return successResponse(res, {
    message: 'OTP sent to your email',
    statusCode: 200,
  });
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  const { email, phone, password, googleId, platform } = req.body;

  // Find user
  const user = await User.findOne({
    $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your account first', 401);
  }

  // Check if user is locked
  if (isUserLocked(user)) {
    throw new AppError('Account is temporarily locked. Try again later.', 429);
  }

  // Validate credentials based on platform
  if (platform === 'local') {
    if (!user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await lockUser(user);
      }

      await user.save();
      throw new AppError('Invalid credentials', 401);
    }
  } else if (platform === 'google') {
    if (user.googleId !== googleId) {
      throw new AppError('Invalid Google credentials', 401);
    }
  }

  // Generate tokens
  const tokens = await generateUserTokens(user);

  return successResponse(res, {
    message: 'Login successful',
    statusCode: 200,
    data: tokens,
  });
};

/**
 * Login with Google
 */
export const loginWithGoogle = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  const oauth2Client = new OAuth2Client();
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new AppError('Invalid Google token', 401);
  }

  const { email, sub: googleId } = payload;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found. Please register first.', 404);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your account first', 401);
  }

  // Generate tokens
  const tokens = await generateUserTokens(user);

  return successResponse(res, {
    message: 'Login successful',
    statusCode: 200,
    data: tokens,
  });
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies['refreshToken'];

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const decoded = (await verifyToken(refreshToken)) as { _id: string };
  if (!decoded?._id) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await User.findById(decoded._id);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  // Generate new tokens
  const tokens = await generateUserTokens(user);

  return successResponse(res, {
    message: 'Token refreshed successfully',
    statusCode: 200,
    data: tokens,
  });
};

/**
 * Forgot password
 */
export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const resetToken = generateToken(
    { _id: user._id, email: user.email },
    { expiresIn: config.RESET_TOKEN_TIME },
    config.resetTokenSecret,
  );

  const resetLink = `${config.clientURI}/reset-password?token=${resetToken}`;

  user.resetToken = resetToken;
  await user.save();

  await sendEmail({
    to: user.email!,
    subject: 'Reset Password',
    text: `Click on the link to reset your password: ${resetLink}`,
  });

  return successResponse(res, {
    message: 'Reset link sent to your email',
    statusCode: 200,
  });
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken, password } = req.body;

  const decoded = await verifyToken(resetToken, config.resetTokenSecret);
  if (!decoded?._id) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  const user = await User.findById(decoded._id);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  if (user.resetToken !== resetToken) {
    throw new AppError('Invalid reset token', 401);
  }

  // Update password
  user.password = await hashPassword(password);
  user.credentialsUpdatedAt = new Date();
  user.resetToken = undefined;

  await user.save();

  // Revoke all existing tokens
  await Token.revokeUserTokens(user._id as string);

  return successResponse(res, {
    message: 'Password reset successfully',
    statusCode: 200,
  });
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(_id);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  // Verify old password
  const isOldPasswordValid = await comparePassword(oldPassword, user.password!);
  if (!isOldPasswordValid) {
    throw new AppError('Old password is incorrect', 400);
  }

  // Prevent reusing the same password
  const isSamePassword = await comparePassword(newPassword, user.password!);
  if (isSamePassword) {
    throw new AppError(
      'New password cannot be the same as the old password',
      400,
    );
  }

  // Update password
  user.password = await hashPassword(newPassword);
  user.credentialsUpdatedAt = new Date();
  await user.save();

  // Revoke all existing tokens
  await Token.revokeUserTokens(user._id as string);

  return successResponse(res, {
    message: 'Password changed successfully',
    statusCode: 200,
    data: { _id: user._id, email: user.email },
  });
};

/**
 * Delete profile (soft delete)
 */
export const deleteProfile = async (req: Request, res: Response) => {
  const { _id } = req.user;

  const user = await User.findById(_id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Soft delete user
  await user.softDelete();

  // Revoke all tokens
  await Token.revokeUserTokens(_id);

  // Delete cloudinary resources
  try {
    await cloudinary.api.delete_resources_by_prefix(`saraha-app/user/${_id}`);
  } catch (error) {
    console.error('Failed to delete cloudinary resources:', error);
  }

  return successResponse(res, {
    message: 'Profile deleted successfully',
    statusCode: 200,
  });
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { allDevices = false } = req.body;

  if (allDevices) {
    // Logout from all devices
    await Token.revokeUserTokens(_id);
  } else {
    // Logout from current device only
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (accessToken) {
      await Token.blacklist(accessToken);
    }
  }

  return successResponse(res, {
    message: 'Logged out successfully',
    statusCode: 200,
  });
};
