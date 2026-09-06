// -----------------------------------------------------------------------------
// auth.routes.js
//
// URL -> controller. No logic here. Mounted at /api/auth in server.js.
// All seven endpoints are POST and unauthenticated (they are how you get a
// token in the first place). auth.middleware.js is applied by OTHER route
// files in later phases.
// -----------------------------------------------------------------------------

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
