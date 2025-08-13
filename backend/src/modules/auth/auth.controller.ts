import { Router } from 'express';

import * as authService from './auth.service';
import * as authValidations from './authValidations';

import { authenticateToken } from '../../middleware/token';
import { isValid } from '../../middleware/validation';

const router = Router();

router.post('/login', isValid(authValidations.loginSchema), authService.login);

router.post(
  '/register',
  isValid(authValidations.registerSchema),
  authService.register,
);

router.post(
  '/registerWithGoogle',
  isValid(authValidations.registerWithGoogleSchema),
  authService.registerWithGoogle,
);

router.post('/verifyAccount', authService.verifyAccount);
router.post(
  '/resendOTP',
  isValid(authValidations.resendOTPSchema),
  authService.resendOTP,
);

router.put(
  '/forgetPassword',
  isValid(authValidations.forgetPasswordSchema),
  authService.forgetPassword,
);
router.put(
  '/resetPassword',
  isValid(authValidations.resetPasswordSchema),
  authService.resetPassword,
);

router.put(
  '/changePassword',
  isValid(authValidations.changePasswordValidation),
  authenticateToken,
  authService.changePassword,
);

router.delete('/deleteProfile', authenticateToken, authService.deleteProfile);

export default router;
