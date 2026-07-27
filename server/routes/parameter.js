const express = require('express');
const router = express.Router();

const {
  getParameters,
  getParameter,
  createParameter,
  updateParameter,
  promoteParameter,
  deleteParameter
} = require('../controllers/parameterController');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getParameters)
  .post(authorize('admin', 'site_engineer'), createParameter);

router.put('/:id/promote', authorize('admin'), promoteParameter);

router.route('/:id')
  .get(getParameter)
  .put(authorize('admin', 'site_engineer'), updateParameter)
  .delete(authorize('admin', 'site_engineer'), deleteParameter);

module.exports = router;
