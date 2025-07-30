import { Router } from 'express';
import * as authService from './auth.service';
const router = Router();

router.post('/register', authService.register);
router.post('/registerWithGoogle', authService.registerWithGoogle);
router.post('/verifyAccount', authService.verifyAccount);
router.post('/resendOTP', authService.resendOTP);
router.post('/login', authService.login);

export default router;
