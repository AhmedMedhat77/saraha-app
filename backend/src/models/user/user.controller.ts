import { Router } from 'express';
import { uploadMulter } from '../../utils/multer';

import * as userServices from './user.service';
import { authenticateToken } from '../../middleware/token';

const router = Router();

router.put(
  '/upload-profile',
  authenticateToken,
  uploadMulter().single('avatar'),
  userServices.uploadImage,
);

export default router;
