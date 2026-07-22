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

router.get('/', getSites);
router.get('/:id', getSite);

router.post('/', protect, authorize('admin'), createSite);
router.put('/:id', protect, authorize('admin'), updateSite);
router.delete('/:id', protect, authorize('admin'), deleteSite);
router.put('/:id/thresholds', protect, authorize('admin'), updateThresholds);

module.exports = router;

// router.use(protect);

// router.route('/:id/thresholds')
//   .put(authorize('admin'), updateThresholds); // only admin can update

// router.route('/')
//   .get(getSites)
//   .post(authorize('admin'), createSite);

// router.route('/:id')
//   .get(getSite)
//   .put(authorize('admin'), updateSite)
//   .delete(authorize('admin'), deleteSite);


// module.exports = router;