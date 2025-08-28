import { Router } from 'express';
import { fileUpload } from '../../utils/multer';

import * as userServices from './user.service';
import { AuthMiddleWare } from '../../middleware/Auth';
import { fileValidationMiddleware } from '../../middleware/fileValidation/file.validation.middleware';
import { multerCloud } from '../../utils/multer/multer.cloud';

const router = Router();

router.put(
  '/upload-profile',
  AuthMiddleWare,
  fileUpload({
    allowedTypes: ['image/jpeg', 'image/png'],
  }).single('avatar'),
  // have to be after multer to get the file
  fileValidationMiddleware(['image/jpeg', 'image/png']),
  userServices.uploadImage,
);

router.put(
  '/upload-profile-cloud',
  AuthMiddleWare,
  multerCloud().single('cloudinaryAvatar'),
  userServices.uploadImageToCloud,
);

router.get('/profile', AuthMiddleWare, userServices.getUserProfile);

// For test you can remove authenticateToken middle ware cause the token default is 15min you have to get new access token to use the api
router.post('/logout', AuthMiddleWare, userServices.logout);
router.put('/refreshToken', userServices.generateNewAccessToken);

export default router;
