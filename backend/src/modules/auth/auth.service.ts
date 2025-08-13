import { Request, Response } from 'express';
import { AppError } from '../../utils/error/AppError';
import { User } from '../../DB/models/user.model';
import { generateOTP } from '../../utils/otp';
import { sendEmail } from '../../utils/email';
import { body } from 'express-validator';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from '../../utils/token';
import { OAuth2Client } from 'google-auth-library';
import config from '../../config';
import { successResponse } from '../../utils/response';
/*
#Steps 
1. Validate the request body

2. Check if the user already exists
2.1 IF User exists and isVerified is true throw error 
2.2 IF User exists and isVerified is false generate OTP and send email
2.3 IF User does not exist create user and generate OTP and send email

3. User can Login with email or Phone 
4. Send email 
5. verify OTP 
6. Register with google 

*/

export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, dob, phone, platform } =
    req.body;

  // 1. Validate required fields
  if (!firstName || !lastName || !dob || !platform) {
    throw new AppError('All fields are required for registration', 400);
  }

  const isGooglePlatform = platform === 'google';

  // 2. Validate password if not Google
  if (!isGooglePlatform && !password) {
    throw new AppError(
      'Password is required for Email or Phone registration',
      400,
    );
  }

  // 3. Validate email format (if present)
  if (email && !body('email').isEmail()) {
    throw new AppError('Invalid email format', 400);
  }

  // 4. Check if user with email or phone already exists
  const existingUser = await User.findOne({
    $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
  });

  // 4.1 If user exists and is verified → throw error
  if (existingUser && existingUser.isVerified) {
    throw new AppError('User already exists', 409);
  }

  const OTP_EXPIRY_TIME = 2 * 60 * 1000; // 2 mins;
  const { otp, otpExpiry } = generateOTP(5, OTP_EXPIRY_TIME);

  if (existingUser && !existingUser.isVerified) {
    // 4.2 Update existing unverified user with new OTP
    existingUser.otp = otp;
    existingUser.otpExpiry = otpExpiry;

    await existingUser.save();

    // Send email if email is present
    if (existingUser.email) {
      await sendEmail({
        to: existingUser.email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp} and it expires in ${OTP_EXPIRY_TIME / 60000} minutes`,
      });
    }

    return res.status(200).json({ message: 'OTP sent to your email.' });
  }

  // 4.2 If user does not exist → create new one
  let hashedPassword;
  if (!isGooglePlatform) {
    hashedPassword = await bcrypt.hash(password, 10);
  }
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

  // Send OTP if email is present
  if (newUser.email) {
    await sendEmail({
      to: newUser.email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`,
    });
  }

  return res
    .status(201)
    .json({ success: true, message: 'User registered. OTP sent to email.' });
};

export const registerWithGoogle = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError('Google token is required', 400);
  }

  const oauth2Client = new OAuth2Client();
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new AppError('Invalid Google token', 401);
  }
  const { email, name, picture } = payload;

  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new AppError('User already exists', 409);
  }

  const newUser = new User({
    email,
    fullName: name,
    avatar: picture,
    platform: 'google',
    googleId: payload.sub,
    isVerified: true,
  });

  const newUserSaved = await newUser.save();
  const token = generateToken(
    {
      _id: newUserSaved._id,
      email: newUserSaved.email,
      phone: newUserSaved.phone,
    },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );
  const refreshToken = generateToken(
    {
      _id: newUserSaved._id,
      email: newUserSaved.email,
      phone: newUserSaved.phone,
    },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );
  // Add refresh token to user
  newUserSaved.refreshToken = refreshToken;
  await newUserSaved.save();

  const {
    password: userPassword,
    refreshToken: userRefreshToken,
    ...user
  } = newUserSaved.toObject();

  return res.status(200).json({ success: true, token, refreshToken, user });
};

/*
1- get Email and OTP from req.body
2- find user by email and check the OTP 
3- if OTP is correct and not expired → update user isVerified to true
4- if OTP is correct and expired → throw error
5- if OTP is incorrect → throw error
6- if user exists  verify account 
*/

export const verifyAccount = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const user = await User.findOne({ email });
  if (!user) throw new AppError('User not found', 404);

  if (!user.otp || !user.otpExpiry) {
    throw new AppError('No OTP associated with this user', 409);
  }

  // 1. Check if user is currently banned
  if (user.OtpBlockTime && new Date(user.OtpBlockTime) > new Date()) {
    throw new AppError('Too many OTP attempts. Try again later.', 429);
  }

  // 2. If ban expired, reset attempts
  if (user.OtpBlockTime && new Date(user.OtpBlockTime) <= new Date()) {
    user.otpAttempts = 0;
    user.OtpBlockTime = undefined;
  }

  // 3. Check OTP expiry
  if (new Date(user.otpExpiry) < new Date()) {
    throw new AppError('OTP has expired', 401);
  }

  // 4. Check OTP match
  if (user.otp !== otp) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    // If reached 5 failed attempts → ban for 5 minutes
    if (user.otpAttempts >= 5) {
      user.OtpBlockTime = new Date(Date.now() + 5 * 60 * 1000);
    }

    await user.save();
    throw new AppError('Invalid OTP', 401);
  }

  // 5. OTP is correct → verify user
  user.isVerified = true;
  user.otpAttempts = 0;
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.OtpBlockTime = undefined;

  await user.save();

  return res
    .status(200)
    .json({ success: true, message: 'User verified successfully' });
};

/*
1. get email from body 
2. check existence of email 
3. if user exists and isVerified is true → throw error 
4. if user exists and isVerified is false → generate OTP and send email 

*/
export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const userExists = await User.findOne({ email });

  if (!userExists) {
    throw new AppError('User not found', 404);
  }
  if (userExists && userExists.isVerified) {
    throw new AppError('User is already verified', 409);
  }

  const { otp, otpExpiry } = generateOTP(5);

  userExists.otp = otp;
  userExists.otpExpiry = otpExpiry;
  await userExists.save();

  await sendEmail({
    to: userExists.email!,
    subject: 'OTP Verification',
    text: `Your OTP is ${otp}`,
  });

  return res
    .status(200)
    .json({ success: true, message: 'OTP sent to your email.' });
};

/*
Login with email or phone or google 
1- get Email and OTP from req.body
2- find the user by email or phone 
3- check if user is verified 
4- check the registration platform 
5- if local compare password 
6- if google compare googleId 
7- generate token and refresh token 
8- return token and refresh token 
*/

export const login = async (req: Request, res: Response) => {
  const { email, phone, password, googleId, platform } = req.body;

  if (!email && !phone) {
    throw new AppError('Email or phone is required', 400);
  }

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  if (!userExists.isVerified) {
    throw new AppError('User is not verified', 401);
  }

  if (platform === 'local' && !bcrypt.compare(password, userExists.password!)) {
    throw new AppError('Invalid password', 401);
  }

  if (platform === 'google' && userExists.googleId !== googleId) {
    throw new AppError('Invalid googleId', 401);
  }
  

  const token = generateToken({ _id: userExists._id }, { expiresIn: '10m' });
  const refreshToken = generateToken(
    { _id: userExists._id, email: userExists.email, phone: userExists.phone },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );

  userExists.refreshToken = refreshToken;
  await userExists.save();

  const {
    password: userPassword,
    refreshToken: userRefreshToken,
    otp,
    otpExpiry,
    googleId: userGoogleId,
    ...user
  } = userExists.toObject();

  return res
    .status(200)
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
    })
    .json({ token, user, success: true });
};

// Refresh token

export const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies['refreshToken'];

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const decoded = (await verifyToken(refreshToken)) as { _id: string };

  const user = await User.findById(decoded._id);
  if(!user){
    throw new AppError('User not found',404);
  }


  const newRefreshToken = generateToken(
    { _id: user._id, email: user.email, phone: user.phone },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );

  const accessToken = generateToken(
    { _id: decoded._id, email: user?.email, phone: user?.phone },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );

  user.refreshToken = newRefreshToken
  user.save();
  return res
    .status(201).cookie('refreshToken',newRefreshToken)
    .header('Authorization', `Bearer ${accessToken}`)
    .json({
      user: { _id: decoded._id },
      success: true,
      message: 'Refresh token generated successfully',
    });
};

/*
1. get email from body 
2. find user by email 
3. generate new Token with different key than regular one 
4. generate link carrying this token 
5. send email with this link 
6. if user clicks on link 
7. verify token 
8. update password 
*/

export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const resetToken = generateToken(
    { _id: user._id, email: user.email },
    { expiresIn: config.RESET_TOKEN_TIME },
    config.resetTokenSecret,
  );

  const resetLink = `${config.clientURI}/${resetToken}`;

  user.resetToken = resetToken;
  await user.save();

  await sendEmail({
    to: user.email!,
    subject: 'Reset Password',
    text: `Click on the link to reset your password: ${resetLink}`,
  });

  return res
    .status(200)
    .json({ success: true, message: 'Reset link sent to your email.' });
};

/*
1. get email and password from req.body 
2. find user by email 
3. verify the link with db Link 
4. update password 
5. remove resetLink from user 
6. generate token and refresh token 
7. return token and refresh token 
*/

export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken, password } = req.body;

  if (!resetToken || !password) {
    throw new AppError('Reset Token and password are required', 400);
  }

  const userExists = await User.findOne({ resetToken });

  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  if (!userExists.resetToken) {
    throw new AppError('user is not in reset mode', 409);
  }

  const decoded = await verifyToken(
    userExists.resetToken!,
    config.resetTokenSecret,
  );

  if (!decoded) {
    throw new AppError('Invalid token', 401);
  }

  userExists.password = password;
  userExists.resetToken = undefined;

  await userExists.save();

  const token = generateToken(
    { _id: userExists._id, email: userExists.email },
    { expiresIn: config.ACCESS_TOKEN_TIME },
  );

  const refreshToken = generateToken(
    { _id: userExists._id, email: userExists.email },
    { expiresIn: config.REFRESH_TOKEN_TIME },
  );

  userExists.refreshToken = refreshToken;
  await userExists.save();

  const {
    password: userPassword,
    refreshToken: userRefreshToken,
    resetToken: userResetToken,
    ...user
  } = userExists.toObject();

  return res
    .status(200)
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
    })
    .json({ success: true, token, user });
};

export const deleteProfile = async (req: Request, res: Response) => {
  const { _id } = req.user!;

  if (!_id) {
    throw new AppError('User not authenticated or invalid user data', 401);
  }

  const userExists = await User.findOne({ _id });

  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  await userExists.deleteOne();

  return res.status(200).json({ success: true, message: 'User deleted' });
};

/**
 * reset password
 *  verify token from request
 * check for old password
 * check if user exists
 * if(userExists)  && not is deleted compare old password sent by user with password in DB
 * change password
 */

export const changePassword = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(_id);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  // Verify old password
  const isMatch = await bcrypt.compare(oldPassword, user.password!);
  if (!isMatch) {
    throw new AppError('Old password is incorrect', 400);
  }

  // Prevent reusing the same password
  const isSamePassword = await bcrypt.compare(newPassword, user.password!);
  if (isSamePassword) {
    throw new AppError(
      'New password cannot be the same as the old password',
      400,
    );
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user
  user.password = hashedPassword;
  await user.save();

  return successResponse(res, {
    message: 'Password updated successfully',
    statusCode: 200,
    data: { _id: user._id, email: user.email },
  });
};
