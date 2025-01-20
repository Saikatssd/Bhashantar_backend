const express = require('express');
const { db } = require('../firebaseAdmin');
const checkPermission = require('../middleware/checkPermission')
const ErrorHandler = require('../utils/errorHandler');


// Endpoint to create new project
// exports.createProject = async (req, res, next) => {
//     const { name, companyId } = req.body;

//     // Check if the name is empty
//     if (!name || name.trim() === "") {
//         return next(new ErrorHandler("Project name cannot be empty", 400));
//     }

//     try {
//         const companyRef = db.collection('companies').doc(companyId);
//         const companySnapshot = await companyRef.get();

//         // Check if the company exists
//         if (!companySnapshot.exists) {
//             return next(new ErrorHandler("Company Not Found", 400));
//         }

//         // Normalize the name to lowercase for case-insensitive comparison
//         const normalizedName = name.trim().toLowerCase();

//         // Fetch all projects in the company
//         const projectsRef = db.collection('projects');
//         const projectQuery = await projectsRef
//             .where('companyId', '==', companyId)
//             .get();

//         // Check for a case-insensitive name match
//         const nameExists = projectQuery.docs.some(doc =>
//             doc.data().name.trim().toLowerCase() === normalizedName
//         );

//         if (nameExists) {
//             return next(new ErrorHandler("Project name already exists", 400));
//         }

//         // Create the new project
//         const projectRef = projectsRef.doc();
//         await projectRef.set({
//             id: projectRef.id,
//             name: name.trim(),
//             companyId,
//             createdAt: new Date(),
//         });

//         res.status(201).send({ name: name.trim(), id: projectRef.id });
//     } catch (error) {
//         next(error);
//         res.status(400).send(error);
//     }
// };


exports.createProject = async (req, res, next) => {
    const { name, companyId, parentId } = req.body
  
    // Check if the name is empty
    if (!name || name.trim() === "") {
      return next(new ErrorHandler("Project name cannot be empty", 400))
    }
  
    try {
      const companyRef = db.collection("companies").doc(companyId)
      const companySnapshot = await companyRef.get()
  
      // Check if the company exists
      if (!companySnapshot.exists) {
        return next(new ErrorHandler("Company Not Found", 400))
      }
  
      // Normalize the name to lowercase for case-insensitive comparison
      const normalizedName = name.trim().toLowerCase()
  
      // Fetch all projects in the company
      const projectsRef = db.collection("projects")
      let projectQuery = projectsRef.where("companyId", "==", companyId)
  
      // If parentId is provided, add it to the query
      if (parentId) {
        projectQuery = projectQuery.where("parentId", "==", parentId)
      } else {
        projectQuery = projectQuery.where("parentId", "==", null)
      }
  
      const projectQuerySnapshot = await projectQuery.get()
  
      // Check for a case-insensitive name match
      const nameExists = projectQuerySnapshot.docs.some((doc) => doc.data().name.trim().toLowerCase() === normalizedName)
  
      if (nameExists) {
        return next(new ErrorHandler("Project name already exists at this level", 400))
      }
  
      // Create the new project
      const projectRef = projectsRef.doc()
      await projectRef.set({
        id: projectRef.id,
        name: name.trim(),
        companyId,
        parentId: parentId || null,
        isFolder: true,
        createdAt: new Date(),
      })
  
      res.status(201).send({ name: name.trim(), id: projectRef.id, parentId: parentId || null })
    } catch (error) {
      next(error)
      res.status(400).send(error)
    }
  }
  
  

// Endpoint to edit/rename a project
exports.editProject = async (req, res, next) => {
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

        // Normalize the new name to lowercase for case-insensitive comparison
        const normalizedNewName = newName.trim().toLowerCase();

        // Fetch all projects in the company except the current project
        const projectsRef = db.collection('projects');
        const projectQuery = await projectsRef
            .where('companyId', '==', companyId)
            .get();

        // Check for a case-insensitive name match within the same company, excluding the current project
        const nameExists = projectQuery.docs.some(doc =>
            doc.id !== id && doc.data().name.trim().toLowerCase() === normalizedNewName
        );

        if (nameExists) {
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
};



// Endpoint to fetch projects for a company
exports.getProjects = async (req, res, next) => {
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
};

//delete project
exports.deleteProject = async (req, res, next) => {
    const { id } = req.body;
    // console.log("Received ID:", id)

    try {
        const docRef = db.collection('projects').doc(id);
        // console.log("Document Reference Path:", docRef.path);

        const project = await docRef.get();
        // console.log("Project Exists:", project.exists);

        if (!project.exists) {
            return next(new ErrorHandler('Project not found', 404));
        }

        await docRef.delete();
        res.status(200).send('Project deleted successfully');
    } catch (error) {
        next(new ErrorHandler('Error deleting Project: ' + error.message, 500));
    }
};



