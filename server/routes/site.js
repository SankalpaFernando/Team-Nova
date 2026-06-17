const express = require('express');
const router = express.Router();

const { 
  getSites, 
  getSite, 
  createSite, 
  updateSite, 
  deleteSite,
  updateThresholds   
  
} = require('../controllers/siteController');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/device/:id/thresholds')
  .put(authorize('admin'), updateThresholds); // only admin can update

router.route('/')
  .get(getSites)
  .post(authorize('admin'), createSite);

router.route('/:id')
  .get(getSite)
  .put(authorize('admin'), updateSite)
  .delete(authorize('admin'), deleteSite);


module.exports = router;