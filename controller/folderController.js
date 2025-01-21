// folderController.js
const { db } = require("../firebaseAdmin");
const ErrorHandler = require("../utils/errorHandler");

exports.createFolder = async (req, res, next) => {
  try {
    const { projectId, folderName, parentFolderId } = req.body;

    // console.log('req',req.body)

    if (!projectId || !folderName) {
      return next(
        new ErrorHandler("projectId and folderName are required", 400)
      );
    }

    // 1) Verify project exists
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return next(new ErrorHandler("Project not found", 401));
    }

    // 2) Verify parent folder, if provided
    let parentFolderRef = null;
    if (parentFolderId) {
      parentFolderRef = projectRef.collection("folders").doc(parentFolderId);
      const parentFolderSnap = await parentFolderRef.get();
      if (!parentFolderSnap.exists) {
        return next(new ErrorHandler("Parent folder not found", 402));
      }
    }

    // 3) Create folder in subcollection
    const folderRef = projectRef.collection("folders").doc(); // auto-generate ID
    const folderData = {
      id: folderRef.id,
      name: folderName.trim(),
      parentFolderId: parentFolderId || null,
      createdAt: new Date(),
    };

    await folderRef.set(folderData);

    return res.status(201).json({
      message: "Folder created successfully",
      folder: folderData,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// exports.getAllFolders = async (req, res, next) => {
//   try {
//     const { projectId } = req.params;

//     // 1) Check project
//     const projectRef = db.collection("projects").doc(projectId);

//     const projectSnap = await projectRef.get();
//     if (!projectSnap.exists) {
//       return next(new ErrorHandler("Project not found", 400));
//     }

//     // 2) Fetch all folders under this project
//     const foldersSnap = await projectRef.collection("folders").get();
//     const folders = foldersSnap.docs.map((doc) => doc.data());

//     // 3) Build a map
//     const folderMap = {};
//     folders.forEach((folder) => {
//       folderMap[folder.id] = { ...folder, children: [] };
//     });

//     // 4) Link children to parents
//     const rootFolders = [];
//     folders.forEach((folder) => {
//       if (folder.parentFolderId) {
//         folderMap[folder.parentFolderId].children.push(folderMap[folder.id]);
//       } else {
//         rootFolders.push(folderMap[folder.id]);
//       }
//     });

//     return res.status(200).json({ folders: rootFolders });
//   } catch (error) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// };


exports.getAllFolders = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // 1) Check project
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return next(new ErrorHandler("Project not found", 400));
    }

    // 2) Fetch all folders under this project
    const foldersSnap = await projectRef.collection("folders").get();
    if (foldersSnap.empty) {
      return res.status(200).json({ folders: [] }); // No folders found
    }

    const folders = foldersSnap.docs.map((doc) => ({
      id: doc.id, // Ensure the document ID is included
      ...doc.data(),
    }));

    // 3) Build a map of folders
    const folderMap = {};
    folders.forEach((folder) => {
      folderMap[folder.id] = { ...folder, children: [] }; // Initialize children array
    });

    // 4) Link children to parents
    const rootFolders = [];
    folders.forEach((folder) => {
      if (folder.parentFolderId) {
        const parentFolder = folderMap[folder.parentFolderId];
        if (parentFolder) {
          parentFolder.children.push(folderMap[folder.id]);
        } else {
          console.warn(`Parent folder not found for folder: ${folder.id}`);
        }
      } else {
        rootFolders.push(folderMap[folder.id]);
      }
    });

    // 5) Return the folder hierarchy
    return res.status(200).json({ folders: rootFolders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};


exports.getFilesByFolder = async (req, res, next) => {
  try {
    const { projectId, folderId } = req.params;
    const projectRef = db.collection("projects").doc(projectId);

    // 1) Check if project exists
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return next(new ErrorHandler("Project not found", 404));
    }

    // 2) Reference to files subcollection
    let filesQuery = projectRef.collection("files");

    // if folderId === 'root' or null => user wants root-level files
    // if folderId is given => user wants files in that folder
    if (folderId === "root" || !folderId) {
      filesQuery = filesQuery.where("folderId", "==", null);
    } else {
      filesQuery = filesQuery.where("folderId", "==", folderId);
    }

    const filesSnap = await filesQuery.get();
    const files = filesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ files });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};
