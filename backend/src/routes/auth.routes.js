// Mounted at /api/auth. Every endpoint is POST and unauthenticated — this is how
// you get a token in the first place.

import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  signup,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);

export default router;
