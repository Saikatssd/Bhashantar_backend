const express = require('express');
const { db } = require('../firebaseAdmin');
const checkPermission = require('../middleware/checkPermission')
const ErrorHandler = require('../utils/errorHandler');
const router = express.Router();

// Endpoint to create new project
// router.post('/createProject', checkPermission('create_project'), async (req, res) => {
router.post('/createProject', async (req, res, next) => {
    const { name, companyId } = req.body;
    try {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnapshot = await companyRef.get();
        if (!companySnapshot.exists) {
            return next(new ErrorHandler("Company Not Found", 400));
        }


        const projectRef = db.collection('projects').doc();
        await projectRef.set({
            id: projectRef.id,
            name,
            companyId,
            createdAt: new Date(),
        });
        res.status(201).send({ name, id: projectRef.id });
    } catch (error) {
        next(error);
        res.status(400).send(error);
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
