
const express = require('express');
const { db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler');
const roleController = require('../controller/roleController');


// Create a new role
router.post('/createRole', roleController.createRole);

// Update a role
router.put('/updateRole', roleController.updateRole);

// Delete a role
router.delete('/deleteRole', roleController.deleteRole);


// Disable a role
router.put('/disableRole', roleController.disableRole);

// Assign a role to a user
router.post('/assignRole', roleController.assignRole);


//get all roles
router.get('/getAllRoles', roleController.getAllRoles);


module.exports = router;
