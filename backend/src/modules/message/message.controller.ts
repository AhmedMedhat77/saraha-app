import { Router } from 'express';
import { upload } from '../../utils/cloud/cloudinary.config';
import * as messageService from './message.service';
import { isValid } from '../../middleware/validation';
import { sendMessageSchema } from './validation';
import { AuthMiddleWare } from '../../middleware/Auth';
const router = Router();

router.post(
  '/:receiver',
  // have to be at first before validation to pares the data
  upload.array('attachments', 2),
  isValid(sendMessageSchema),
  messageService.sendAnonymousMessage,
);

router.post(
  '/:receiver/sender',
  // have to be at first before validation to pares the data
  AuthMiddleWare,
  upload.array('attachments', 2),
  isValid(sendMessageSchema),
  messageService.sendMessage,
);

router.get('/', AuthMiddleWare, messageService.getMessages);
router.get('/:id', AuthMiddleWare, messageService.getMessageById);

export default router;
