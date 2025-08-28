import { Request, Response } from 'express';
import {
  defaultFolder,
  filesUpload,
} from '../../utils/cloud/cloudinary.config';
import { Message } from '../../DB/models/message.model';
import { errorResponse, successResponse } from '../../utils/response';

export const sendAnonymousMessage = async (req: Request, res: Response) => {
  const { content } = req.body;
  const { receiver } = req.params;
  console.log(receiver, content);
  const files = req.files as Express.Multer.File[];
  let uploadedFiles: { public_id: string; secure_url: string }[] = [];
  if (files.length) {
    uploadedFiles = await filesUpload(
      files.map((file) => file.path),
      {
        folder: defaultFolder(receiver, 'messages'),
      },
    );
  }
  const message = await Message.create({
    receiver,
    content,
    attachments: files.length ? uploadedFiles : [],
  });
  return successResponse(res, {
    data: message,
    statusCode: 201,
    message: 'Message sent successfully',
  });
};

export const sendMessage = async (req: Request, res: Response) => {
  const { content } = req.body;
  const { receiver } = req.params;
  const { _id } = req.user;
  console.log(receiver, content);
  const files = req.files as Express.Multer.File[];
  let uploadedFiles: { public_id: string; secure_url: string }[] = [];
  if (files.length) {
    uploadedFiles = await filesUpload(
      files.map((file) => file.path),
      {
        folder: defaultFolder(receiver, 'messages'),
      },
    );
  }
  const message = await Message.create({
    receiver,
    content,
    sender: _id,
    attachments: files.length ? uploadedFiles : [],
  });
  return successResponse(res, {
    data: message,
    statusCode: 201,
    message: 'Message sent successfully',
  });
};

export const getMessages = async (req: Request, res: Response) => {
  const { _id } = req.user;
  const { page, limit } = req.query;
  const skip = (Number(page || 1) - 1) * Number(limit || 10);

  const messages = await Message.find({ receiver: _id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit || 10));

  if (!messages.length) {
    return errorResponse(res, {
      statusCode: 404,
      message: 'No messages found',
    });
  }

  return successResponse(res, {
    data: messages,
    statusCode: 200,
    message: 'Messages fetched successfully',
  });
};

export const getMessageById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const message = await Message.findById({
    _id: id,
    receiver: req.user._id,
  })
    .populate('sender', 'firstName lastName email avatar')
    .populate('receiver', 'firstName lastName email avatar');
  if (!message) {
    return errorResponse(res, {
      statusCode: 404,
      message:
        'Message not found or you are not authorized to access this message',
    });
  }
  return successResponse(res, {
    data: message,
    statusCode: 200,
    message: 'Message fetched successfully',
  });
};
