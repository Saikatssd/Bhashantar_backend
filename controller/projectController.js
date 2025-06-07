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



// app.get('/api/projects/:projectId/user-wip-count',
exports.fetchUserWIPCount = async (req, res) => {
  const userId = req.user.uid;
  const snapshot = await db
    .collectionGroup('files')
    .where('status', '==', 3)
    .where('kyro_assignedTo', '==', userId)
    .limit(1)
    .get();
  res.json({ count: snapshot.size });
};


exports.kyroUserWorkInProgress = async (req, res) => {
  const uid = req.user.uid;
  const snapshot = await db
    .collectionGroup("files")
    .where("status", "==", 3)
    .where("kyro_assignedTo", "==", uid)
    .get();

  const files = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const projectRef = doc.ref.parent.parent;      
      const projSnap = await projectRef.get();
      return {
        id: doc.id,
         ...doc.data(),
        pageCount: data.pageCount,
        kyro_assignedDate: data.kyro_assignedDate,
        projectName: projSnap.exists ? projSnap.data().name : "Unknown",
      };
    })
  );

  res.json(files);
};



exports.kyroUserCompletedFiles = async (req, res) => {
  const uid = req.user.uid;
  const snapshot = await db
    .collectionGroup("files")
    .where("status", ">=", 4)
    .where("kyro_assignedTo", "==", uid)
    .get();

  const files = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const projectRef = doc.ref.parent.parent;
      const projSnap = await projectRef.get();
      return {
        id: doc.id,
         ...doc.data(),
        pageCount: data.pageCount,
        kyro_completedDate: data.kyro_completedDate,
        projectName: projSnap.exists ? projSnap.data().name : "Unknown",
      };
    })
  );

  res.json(files);
};






exports.clientUserWorkInProgress = async (req, res) => {
  const uid = req.user.uid;
  const snapshot = await db
    .collectionGroup("files")
    .where("status", "==", 6)
    .where("client_assignedTo", "==", uid)
    .get();

  const files = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const projectRef = doc.ref.parent.parent;      
      const projSnap = await projectRef.get();
      return {
        id: doc.id,
         ...doc.data(),
        pageCount: data.pageCount,
        client_assignedDate: data.client_assignedDate,
        projectName: projSnap.exists ? projSnap.data().name : "Unknown",
      };
    })
  );

  res.json(files);
};



exports.clientUserCompletedFiles = async (req, res) => {
  const uid = req.user.uid;
  const snapshot = await db
    .collectionGroup("files")
    .where("status", ">=", 7)
    .where("client_assignedTo", "==", uid)
    .get();

  const files = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const projectRef = doc.ref.parent.parent;
      const projSnap = await projectRef.get();
      return {
        id: doc.id,
         ...doc.data(),
        pageCount: data.pageCount,
        client_completedDate: data.client_completedDate,
        projectName: projSnap.exists ? projSnap.data().name : "Unknown",
      };
    })
  );

  res.json(files);
};




/**
 * GET /api/user/projects-count
 * Query parameters (as ISO strings):
 *   - startDate    (e.g. "2025-01-01T00:00:00.000Z")
 *   - endDate      (e.g. "2025-12-31T23:59:59.999Z")
 *
 * The authenticated user’s UID is in req.user.uid (via authMiddleware).
 * This function runs a single collectionGroup query on all "files" subcollections,
 * filters by kyro_assignedTo === req.user.uid and status in [3..8], and then
 * tallies pending (status===3), underReview (status===4), and completed (>=5),
 * only counting “underReview/completed” if kyro_completedDate ∈ [startDate, endDate].
 */
exports.getUserFileCount = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    // Validate incoming dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required." });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    // 1) Build one collectionGroup query across all "files" subcollections
    //    Filtering: kyro_assignedTo == current user AND status in [3,4,5,6,7,8]

    const filesGroupRef = db.collectionGroup("files");
    const filesQuery = filesGroupRef
      .where("kyro_assignedTo", "==", userId)
      .where("status", "in", [3, 4, 5, 6, 7, 8]);

    // 2) Fetch all matching file documents in ONE network round‐trip
    const snapshot = await filesQuery.get();

    // 3) Tally up counts & pages
    let pendingCount = 0;
    let underReviewCount = 0;
    let completedCount = 0;
    let pendingPages = 0;
    let underReviewPages = 0;
    let completedPages = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      const pages = data.pageCount || 0;

      // status===3 → pending (in WIP)
      if (status === 3) {
        pendingCount += 1;
        pendingPages += pages;
      }

      // For “under review” (4) or “completed” (>=5), only include if completedDate in range
      if (data.kyro_completedDate) {
        // If kyro_completedDate is a Firestore Timestamp, convert to JS Date:
        const completedTs = typeof data.kyro_completedDate.toDate === "function"
          ? data.kyro_completedDate.toDate()
          : new Date(data.kyro_completedDate);

        if (completedTs >= start && completedTs <= end) {
          if (status === 4) {
            underReviewCount += 1;
            underReviewPages += pages;
          } else if (status >= 5) {
            completedCount += 1;
            completedPages += pages;
          }
        }
      }
    });

    // 4) Zero-pad each count/page value to two digits
    const pad2 = (n) => (n > 9 ? `${n}` : `0${n}`);
    return res.json({
      pendingCount: pad2(pendingCount),
      completedCount: pad2(completedCount),
      underReviewCount: pad2(underReviewCount),
      pendingPages: pad2(pendingPages),
      completedPages: pad2(completedPages),
      underReviewPages: pad2(underReviewPages),
    });
  } catch (err) {
    console.error("Error in getUserProjectsCount:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
