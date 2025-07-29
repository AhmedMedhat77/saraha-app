import { model, Schema, Document } from 'mongoose';

interface IUser extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar: string;
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  platform: 'local' | 'google';
  dob?: Date;
  fullName?: string;
  age?: number;
  refreshToken?: string;
}

const schema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.platform === 'local';
      },
    },
    avatar: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    platform: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    dob: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//  Ensure at least one of email or phone is present
schema.pre('validate', function (next) {
  if (this.platform === 'local' && !this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone is required for local signups.');
    this.invalidate('phone', 'Either phone or email is required for local signups.');
  }
  next();
});

//  Virtual for fullName
schema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
schema.virtual('age').get(function (this: IUser) {
  if (!this.dob) return null;
  const ageDiff = Date.now() - this.dob.getTime();
  return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
});

export const User = model<IUser>('User', schema);