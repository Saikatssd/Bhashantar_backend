const express = require('express');
const { db } = require('../firebaseAdmin');
const checkPermission = require('../middleware/checkPermission')
const ErrorHandler = require('../utils/errorHandler');
const router = express.Router();

// Endpoint to create new project
router.post('/createProject', async (req, res, next) => {
    const { name, companyId } = req.body;

    // Check if the name is empty
    if (!name || name.trim() === "") {
        return next(new ErrorHandler("Project name cannot be empty", 400));
    }

    try {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnapshot = await companyRef.get();

        // Check if the company exists
        if (!companySnapshot.exists) {
            return next(new ErrorHandler("Company Not Found", 400));
        }

        // Check if the project name already exists within the same company
        const projectsRef = db.collection('projects');
        const projectQuery = await projectsRef
            .where('companyId', '==', companyId)
            .where('name', '==', name.trim())
            .get();

        if (!projectQuery.empty) {
            return next(new ErrorHandler("Project name already exists", 400));
        }

        // Create the new project
        const projectRef = projectsRef.doc();
        await projectRef.set({
            id: projectRef.id,
            name: name.trim(),
            companyId,
            createdAt: new Date(),
        });

        res.status(201).send({ name: name.trim(), id: projectRef.id });
    } catch (error) {
        next(error);
        res.status(400).send(error);
    }
});


// Endpoint to edit/rename a project
router.put('/editProject', async (req, res, next) => {
    const { id, newName } = req.body;

    // Check if the new name is empty
    if (!newName || newName.trim() === "") {
        return next(new ErrorHandler("Project name cannot be empty", 400));
    }

    try {
        const projectRef = db.collection('projects').doc(id);
        const projectSnapshot = await projectRef.get();

        // Check if the project exists
        if (!projectSnapshot.exists) {
            return next(new ErrorHandler("Project Not Found", 404));
        }

        const { companyId } = projectSnapshot.data();

        // Check if the new project name already exists within the same company
        const projectsRef = db.collection('projects');
        const projectQuery = await projectsRef
            .where('companyId', '==', companyId)
            .where('name', '==', newName.trim())
            .get();

        if (!projectQuery.empty) {
            return next(new ErrorHandler("Project name already exists", 400));
        }

        // Update the project with the new name
        await projectRef.update({
            name: newName.trim(),
        });

        res.status(200).send({ message: "Project renamed successfully", id });
    } catch (error) {
        next(new ErrorHandler('Error editing Project: ' + error.message, 500));
    }
});


// Endpoint to fetch projects for a company
router.get('/:companyId/getProjects', async (req, res, next) => {
    const { companyId } = req.params;
    try {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnapshot = await companyRef.get();
        if (!companySnapshot.exists) {
            return next(new ErrorHandler("Company Not Found", 400));
        }
        const projectsSnapshot = await db.collection('projects').where('companyId', '==', companyId).get();
        const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).send(projects);
    } catch (error) {
        next(error);
        res.status(400).send(error);
    }
});

//delete project
router.delete('/deleteProject', async (req, res, next) => {
    const { id } = req.body;
    try {
        const project = await db.collection('project').doc(id).get();
        if (!project.exists) {
            return next(new ErrorHandler('project not found', 404));
        }

        await db.collection('project').doc(id).delete();
        res.status(200).send('Project deleted successfully');
    } catch (error) {
        next(new ErrorHandler('Error deleting Project: ' + error.message, 500));
    }
});

module.exports = router;
