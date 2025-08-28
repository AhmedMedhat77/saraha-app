import { model, Schema, Document, Types, Model } from 'mongoose';

interface IUser extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar?: string;
  cloudinaryAvatar?: {
    public_id: string;
    secure_url: string;
  };
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  platform: 'local' | 'google';
  dob?: Date;
  googleId?: string;
  fullName?: string;
  age?: number;
  refreshToken?: string | null;
  resetToken?: string | null;
  OtpBlockTime?: Date | null;
  otpAttempts: number;
  isDeleted: boolean;
  deletedAt?: Date;
  credentialsUpdatedAt?: Date | null;
  lastLoginAt?: Date;
  loginAttempts: number;
  isLocked: boolean;
  lockedUntil?: Date;
  
  // Instance methods
  softDelete(): Promise<IUser>;
  restore(): Promise<IUser>;
}

interface IUserModel extends Model<IUser> {
  softDelete(userId: string | Types.ObjectId): Promise<IUser | null>;
  restore(userId: string | Types.ObjectId): Promise<IUser | null>;
  hardDelete(userId: string | Types.ObjectId): Promise<IUser | null>;
}

const schema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple null values for unique index
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple null values for unique index
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.platform === 'local';
      },
      minlength: 6,
    },
    fullName: {
      type: String,
      virtual: true,
      get: function (this: IUser) {
        return `${this.firstName} ${this.lastName}`;
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
    },
    avatar: {
      type: String,
    },
    cloudinaryAvatar: {
      type: {
        public_id: String,
        secure_url: String,
      },
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
      sparse: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true, // Index for soft delete queries
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    OtpBlockTime: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    credentialsUpdatedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpiry;
        delete ret.resetToken;
        delete ret.refreshToken;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Compound indexes for better query performance
schema.index({ email: 1, isDeleted: 1 });
schema.index({ phone: 1, isDeleted: 1 });
schema.index({ googleId: 1, isDeleted: 1 });
schema.index({ isVerified: 1, isDeleted: 1 });
schema.index({ platform: 1, isDeleted: 1 });

// Virtual for messages
schema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'receiver',
});

// Pre-save middleware for validation and data processing
schema.pre('save', function (next) {
  // Set fullName
  this.fullName = `${this.firstName} ${this.lastName}`;

  // Set age if dob exists
  if (this.dob) {
    const ageDiff = Date.now() - this.dob.getTime();
    this.age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
  }

  next();
});

// Pre-validate middleware
schema.pre('validate', function (next) {
  // Ensure at least one of email or phone is present for local platform
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

  // Validate age for local platform
  if (this.platform === 'local' && this.dob) {
    const age = this.age || 0;
    if (age < 13) {
      this.invalidate('dob', 'User must be at least 13 years old.');
    }
    if (age > 120) {
      this.invalidate('dob', 'Invalid date of birth.');
    }
  }

  next();
});

// Static method for soft delete
schema.statics.softDelete = async function (userId: string | Types.ObjectId) {
  return this.findByIdAndUpdate(
    userId,
    {
      isDeleted: true,
      deletedAt: new Date(),
      credentialsUpdatedAt: new Date(),
      refreshToken: null,
      resetToken: null,
      otp: null,
      otpExpiry: null,
      OtpBlockTime: null,
      otpAttempts: 0,
    },
    { new: true },
  );
};

// Static method for restore
schema.statics.restore = async function (userId: string | Types.ObjectId) {
  return this.findByIdAndUpdate(
    userId,
    {
      isDeleted: false,
      deletedAt: null,
      credentialsUpdatedAt: new Date(),
    },
    { new: true },
  );
};

// Static method for hard delete (admin only)
schema.statics.hardDelete = async function (userId: string | Types.ObjectId) {
  return this.findByIdAndDelete(userId);
};

// Instance method for soft delete
schema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.credentialsUpdatedAt = new Date();
  this.refreshToken = null;
  this.resetToken = null;
  this.otp = null;
  this.otpExpiry = null;
  this.OtpBlockTime = null;
  this.otpAttempts = 0;
  return this.save();
};

// Instance method for restore
schema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.credentialsUpdatedAt = new Date();
  return this.save();
};

export const User = model<IUser, IUserModel>('User', schema);
