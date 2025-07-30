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
  try {
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

    const { otp, otpExpiry } = generateOTP(5);

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
          text: `Your OTP is ${otp}`,
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
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
  }
};

export const registerWithGoogle = async (req: Request, res: Response) => {
  try {
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
      { _id: newUserSaved._id, email: newUserSaved.email, phone: newUserSaved.phone },
      { expiresIn: config.ACCESS_TOKEN_TIME },
    );
    const refreshToken = generateToken(
      { _id: newUserSaved._id, email: newUserSaved.email, phone: newUserSaved.phone },
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
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ message: error.message || 'Internal Server Error' });
  }
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
  try {
    const { email, otp } = req.body;

    // 1- Validate input
    if (!email || !otp) {
      throw new AppError('Email and OTP are required', 400);
    }

    // 2- Find user
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.otp || !user.otpExpiry) {
      throw new AppError('No OTP associated with this user', 409);
    }

    // 3- Check OTP match
    if (user.otp !== otp) {
      throw new AppError('Invalid OTP', 401);
    }

    // 4- Check if OTP is expired
    if (new Date(user.otpExpiry) < new Date()) {
      throw new AppError('OTP has expired', 401);
    }

    // 5- Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: 'User verified successfully' });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ message: error.message || 'Internal Server Error' });
  }
};

/*
1. get email from body 
2. check existence of email 
3. if user exists and isVerified is true → throw error 
4. if user exists and isVerified is false → generate OTP and send email 

*/
export const resendOTP = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
  }
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
  try {
    const { email, phone, password, googleId } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { phone }] });

    if (!userExists) {
      throw new AppError('User not found', 404);
    }

    if (!userExists.isVerified) {
      throw new AppError('User is not verified', 401);
    }

    if (
      userExists.platform === 'local' &&
      !bcrypt.compare(password, userExists.password!)
    ) {
      throw new AppError('Invalid password', 401);
    }

    if (userExists.platform === 'google' && userExists.googleId !== googleId) {
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
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
  }
};

// Refresh token

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401);
    }

    const decoded = (await verifyToken(refreshToken)) as { _id: string };

    const user = await User.findById(decoded._id);

    const accessToken = generateToken(
      { _id: decoded._id , email: user?.email, phone: user?.phone },
      { expiresIn: config.ACCESS_TOKEN_TIME },
    );

    return res
      .status(201)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        user: { _id: decoded._id },
        success: true,
        message: 'Refresh token generated successfully',
      });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || 'Internal Server Error',
      });
  }
};
