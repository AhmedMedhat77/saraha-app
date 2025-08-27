import { Router } from 'express';
import { fileUpload } from '../../utils/multer';

import * as userServices from './user.service';
import { authenticateToken } from '../../middleware/token';
import { fileValidationMiddleware } from '../../middleware/fileValidation/file.validation.middleware';
import { multerCloud } from '../../utils/multer/multer.cloud';

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

router.put(
  '/upload-profile-cloud',
  authenticateToken,
  multerCloud().single('cloudinaryAvatar'),
  userServices.uploadImageToCloud,
);

router.get('/profile', authenticateToken, userServices.getUserProfile);

// For test you can remove authenticateToken middle ware cause the token default is 15min you have to get new access token to use the api
router.post('/logout', authenticateToken, userServices.logout);
router.put('/refreshToken', userServices.generateNewAccessToken);

export default router;
