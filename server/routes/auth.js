const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmailCode,
  resendEmailCode,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-email-code', verifyEmailCode);
router.post('/resend-email-code', resendEmailCode);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
