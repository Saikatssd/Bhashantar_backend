
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const authController = require('../controller/authController')


router.post('/createUser',authController.createUser);

router.post('/registerSuperAdmin',authController.registerSuperAdmin);

router.get('/getUserProfile', verifyToken, authController.getUserProfile);


// Disable a user
router.post('/disableUser', authController.disableUser);

// Endpoint to enable a user
router.post('/enableUser', authController.enableUser);


module.exports = router;

