import { User } from './user.model';
import { model, Schema, Document, Types, Model } from 'mongoose';

interface IToken extends Document {
  _id: string;
  token: string;
  type: 'access' | 'refresh';
  userId: Types.ObjectId;
  isBlacklisted: boolean;
  expiresAt?: Date; // Made optional to handle existing data
  deviceInfo?: {
    userAgent: string;
    ip: string;
    deviceId: string;
  };
}

interface ITokenModel extends Model<IToken> {
  blacklist(token: string): Promise<IToken | null>;
  isValid(token: string, type?: 'access' | 'refresh'): Promise<IToken | null>;
  cleanExpired(): Promise<any>;
  getUserTokens(userId: string | Types.ObjectId, type?: 'access' | 'refresh'): Promise<IToken[]>;
  revokeUserTokens(userId: string | Types.ObjectId, type?: 'access' | 'refresh'): Promise<any>;
}

const schema = new Schema<IToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['access', 'refresh'],
      required: true,
      index: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: false, // Made optional to handle existing data
      index: true,
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      deviceId: String,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for better query performance
schema.index({ userId: 1, type: 1, isBlacklisted: 1 });
schema.index({ token: 1, type: 1, isBlacklisted: 1 });
schema.index({ expiresAt: 1, isBlacklisted: 1 });



// Static method to blacklist token
schema.statics.blacklist = async function(token: string) {
  return this.findOneAndUpdate(
    { token },
    { isBlacklisted: true },
    { new: true }
  );
};

// Static method to check if token is valid
schema.statics.isValid = async function(token: string, type?: 'access' | 'refresh') {
  const query: any = { 
    token, 
    isBlacklisted: false,
  };
  
  // Only check expiration if expiresAt field exists
  const tokenDoc = await this.findOne({ token });
  if (tokenDoc && tokenDoc.expiresAt) {
    query.expiresAt = { $gt: new Date() };
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.findOne(query);
};

// Static method to clean expired tokens
schema.statics.cleanExpired = async function() {
  return this.deleteMany({
    $and: [
      { expiresAt: { $exists: true } },
      { expiresAt: { $lt: new Date() } }
    ]
  });
};

// Static method to get user's active tokens
schema.statics.getUserTokens = async function(userId: string | Types.ObjectId, type?: 'access' | 'refresh') {
  const query: any = { 
    userId, 
    isBlacklisted: false,
  };
  
  if (type) {
    query.type = type;
  }
  
  const tokens = await this.find(query);
  
  // Filter out expired tokens in memory if expiresAt exists
  return tokens.filter((token: IToken) => {
    if (!token.expiresAt) return true; // Keep tokens without expiration
    return new Date(token.expiresAt) > new Date();
  });
};

// Static method to revoke all user tokens
schema.statics.revokeUserTokens = async function(userId: string | Types.ObjectId, type?: 'access' | 'refresh') {
  const query: any = { userId };
  
  if (type) {
    query.type = type;
  }
  
  return this.updateMany(query, { isBlacklisted: true });
};

export const Token = model<IToken, ITokenModel>('Token', schema);
