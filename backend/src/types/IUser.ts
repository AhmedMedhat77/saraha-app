export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar: string;
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  platform: 'local' | 'google';
  dob?: Date;
  refreshToken?: string;
  fullName?: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
}
