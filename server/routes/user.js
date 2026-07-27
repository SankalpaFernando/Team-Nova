const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, updateProfile, getRecentLogins, changeUserRole } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.put('/profile', updateProfile);
router.get('/recent-logins', authorize('admin'), getRecentLogins);
router.put('/:id/role', authorize('admin'), changeUserRole);

router.route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;