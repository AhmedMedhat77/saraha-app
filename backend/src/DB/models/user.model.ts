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
  googleId?: string;
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
      lowercase: true,
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
    fullName: {
      type: String,
      virtual: true,
      get: function (this: IUser) {
        return `${this.firstName} ${this.lastName}`;
      },
      set: function (this: IUser) {
        this.fullName = this.firstName + ' ' + this.lastName;
      },
    },
    age: {
      type: Number,
      virtual: true,
      get: function (this: IUser) {
        if (!this.dob) return null;
        const ageDiff = Date.now() - this.dob.getTime();
        return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
      },
      set: function (this: IUser) {
        this.age = this.dob
          ? Math.floor(
              (Date.now() - this.dob.getTime()) /
                (1000 * 60 * 60 * 24 * 365.25),
            )
          : undefined;
      },
    },
    avatar: {
      type: String,
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
    googleId: {
      type: String,
      default: null,
      required: function (this: IUser) {
        return this.platform === 'google';
      },
    },
    dob: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

//  Ensure at least one of email or phone is present
schema.pre('validate', function (next) {
  if (this.platform === 'local' && !this.email && !this.phone) {
    this.invalidate(
      'email',
      'Either email or phone is required for local signups.',
    );
    this.invalidate(
      'phone',
      'Either phone or email is required for local signups.',
    );
  }
  next();
});

export const User = model<IUser>('User', schema);
