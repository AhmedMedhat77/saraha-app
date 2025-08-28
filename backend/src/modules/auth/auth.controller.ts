import { Router } from 'express';

import * as authService from './auth.service';
import * as authValidations from './authValidations';

import { AuthMiddleWare } from '../../middleware/Auth';
import { isValid } from '../../middleware/validation';

const router = Router();

// Public routes
router.post('/register', isValid(authValidations.registerSchema), authService.register);
router.post('/register/google', isValid(authValidations.registerWithGoogleSchema), authService.registerWithGoogle);
router.post('/verify', isValid(authValidations.verifyAccountSchema), authService.verifyAccount);
router.post('/resend-otp', isValid(authValidations.resendOTPSchema), authService.resendOTP);
router.post('/login', isValid(authValidations.loginSchema), authService.login);
router.post('/login/google', isValid(authValidations.registerWithGoogleSchema), authService.loginWithGoogle);
router.post('/forgot-password', isValid(authValidations.forgetPasswordSchema), authService.forgetPassword);
router.post('/reset-password', isValid(authValidations.resetPasswordSchema), authService.resetPassword);
router.post('/refresh-token', authService.refreshToken);

// Protected routes
router.post('/logout', AuthMiddleWare, isValid(authValidations.logoutSchema), authService.logout);
router.put('/change-password', AuthMiddleWare, isValid(authValidations.changePasswordValidation), authService.changePassword);
router.delete('/delete-profile', AuthMiddleWare, authService.deleteProfile);

export default router;
