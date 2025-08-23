import { Request, Response } from 'express';
import {
  defaultFolder,
  filesUpload,
} from '../../utils/cloud/cloudinary.config';
import { Message } from '../../DB/models/message.model';
import { successResponse } from '../../utils/response';

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
