const express = require('express');
const { db } = require('../firebaseAdmin');
const checkPermission = require('../middleware/checkPermission')
const ErrorHandler = require('../utils/errorHandler');
const router = express.Router();
const projectController = require('../controller/projectController')
const verifyToken = require('../middleware/verifyToken');


router.get("/user-wip-count",verifyToken, projectController.fetchUserWIPCount);

// Endpoint to create new project
router.post('/createProject', projectController.createProject);

// Endpoint to edit/rename a project
router.put('/editProject', projectController.editProject);

// Endpoint to fetch projects for a company
router.get('/:companyId/getProjects',projectController.getProjects);

//delete project
router.delete('/deleteProject',projectController.deleteProject);

router.get("/files/inProgress",verifyToken, projectController.kyroUserWorkInProgress);
router.get("/files/completed",verifyToken, projectController.kyroUserCompletedFiles);

router.get("/files/clientInProgress",verifyToken, projectController.clientUserWorkInProgress);
router.get("/files/clientCompleted",verifyToken, projectController.clientUserCompletedFiles);


router.get("/user/fileCount", verifyToken, projectController.getUserFileCount);

module.exports = router;
