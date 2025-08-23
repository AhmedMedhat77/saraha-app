import { model, ObjectId, Schema } from 'mongoose';

type IMessage = {
  sender?: ObjectId;
  receiver: ObjectId;
  content: string;
  attachments?: string[];
};
const schema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
    },
    attachments: {
      type: [
        {
          public_id: String,
          secure_url: String,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// invalidation
schema.pre('validate', function (next) {
  if (!this.content && !this.attachments) {
    throw new Error('Content or attachments is required');
  }
  next();
});

export const Message = model<IMessage>('Message', schema);
