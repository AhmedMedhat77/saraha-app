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

// For test you can remove authenticateToken middle ware cause the token default is 15min you have to get new access token to use the api
router.delete('/logout', authenticateToken, userServices.logout);
router.put('/refreshToken', userServices.generateNewAccessToken);

export default router;
