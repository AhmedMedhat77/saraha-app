import { Router } from 'express';
import { fileUpload } from '../../utils/multer';

import * as userServices from './user.service';
import { authenticateToken } from '../../middleware/token';
import { fileValidationMiddleware } from '../../middleware/fileValidation/file.validation.middleware';

const router = Router();

router.put(
  '/upload-profile',
  authenticateToken,
  fileUpload({
    allowedTypes: ['image/jpeg', 'image/png'],
  }).single('avatar'),
  // have to be after multer to get the file
  fileValidationMiddleware(['image/jpeg', 'image/png']),
  userServices.uploadImage,
);

// For test you can remove authenticateToken middle ware cause the token default is 15min you have to get new access token to use the api
router.delete('/logout', authenticateToken, userServices.logout);
router.put('/refreshToken', userServices.generateNewAccessToken);

export default router;
