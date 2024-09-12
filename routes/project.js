const express = require('express');
const { db } = require('../firebaseAdmin');
const checkPermission = require('../middleware/checkPermission')
const ErrorHandler = require('../utils/errorHandler');
const router = express.Router();
const projectController = require('../controller/projectController')

// Endpoint to create new project
router.post('/createProject', projectController.createProject);

// Endpoint to edit/rename a project
router.put('/editProject', projectController.editProject);

// Endpoint to fetch projects for a company
router.get('/:companyId/getProjects',projectController.getProjects);

//delete project
router.delete('/deleteProject',projectController.deleteProject);


module.exports = router;
