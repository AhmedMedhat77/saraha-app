import { User } from './user.model';
import { model, Schema } from 'mongoose';

interface IToken extends Document {
  _id: string;
  token: string | undefined;
  type: 'access' | 'refresh';
  user: typeof User;
}

const schema = new Schema<IToken>(
  {
    token: {
      type: String,
      default: undefined,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['access', 'refresh'],
      default: 'access',
    },
  },
  {
    timestamps: true,
  },
);

export const Token = model<IToken>('Token', schema);
