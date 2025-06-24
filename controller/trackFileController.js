const express = require("express");
const { db } = require("../firebaseAdmin");
const ErrorHandler = require("../utils/errorHandler");

// Log a revert action
exports.logRevertAction = async (req, res, next) => {
  const { projectId, fileId, userId, reason } = req.body;

  try {
    // Validate required fields
    if (!projectId || !fileId || !userId || !reason) {
      return next(
        new ErrorHandler(
          "Missing required fields: projectId, fileId, userId, reason",
          400
        )
      );
    }

    // Check if project exists
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnapshot = await projectRef.get();
    if (!projectSnapshot.exists) {
      return next(new ErrorHandler("Project not found", 400));
    }

    // Check if file exists
    const fileRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files")
      .doc(fileId);
    const fileSnapshot = await fileRef.get();
    if (!fileSnapshot.exists) {
      return next(new ErrorHandler("File not found", 400));
    }

    // Get current revert counter and increment
    let revertCounter = fileSnapshot.data().revertCounter || 0;
    revertCounter += 1;

    let assignedId = fileSnapshot.data().kyro_assignedTo;

    // Log revert action in the reverts collection
    const revertCollection = db.collection("reverts");
    const revertDoc = {
      projectId,
      fileId,
      userId,
      assignedId,
      reason,
      revertDate: new Date(),
      status: 3,
      counter: revertCounter, // Add counter to revert doc
    };

    const docRef = await revertCollection.add(revertDoc);
    const revertId = docRef.id;

    // Update file with new revertCounter and revertId
    await fileRef.update({
      revertCounter,
      revertId,
    });

    res.status(201).send({ id: revertId, ...revertDoc });
  } catch (error) {
    console.error("Error logging revert action:", error);
    next(error);
  }
};

// Fetch revert history for a project or specific file
exports.fetchRevertHistory = async (req, res, next) => {
  const { projectId, fileId } = req.query;

  try {
    // Validate projectId
    if (!projectId) {
      return next(new ErrorHandler("Missing required field: projectId", 400));
    }

    // Check if project exists
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnapshot = await projectRef.get();
    if (!projectSnapshot.exists) {
      return next(new ErrorHandler("Project not found", 400));
    }

    const revertCollection = db.collection("reverts");
    let query = revertCollection.where("projectId", "==", projectId);

    // If fileId is provided, add it to the query
    if (fileId) {
      query = query.where("fileId", "==", fileId);
      // Check if file exists
      const fileRef = db
        .collection("projects")
        .doc(projectId)
        .collection("files")
        .doc(fileId);
      const fileSnapshot = await fileRef.get();
      if (!fileSnapshot.exists) {
        return next(new ErrorHandler("File not found", 400));
      }
    }

    const revertSnapshot = await query.get();
    const revertHistory = revertSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      revertDate: doc.data().revertDate ? doc.data().revertDate : null,
    }));

    res.status(200).send(revertHistory);
  } catch (error) {
    console.error("Error fetching revert history:", error);
    next(error);
  }
};

// Record file submission details in file_submissions collection
exports.recordFileSubmission = async (req, res, next) => {
  const {
    projectId,
    documentId,
    userId,
    userName,
    fileName,
    fileUrl,
    companyId,
  } = req.body;

  try {
    // Validate required fields
    if (
      !projectId ||
      !documentId ||
      !userId ||
      !userName ||
      !fileUrl ||
      !fileName ||
      !companyId
    ) {
      return next(
        new ErrorHandler(
          "Missing required fields: projectId, documentId, userId, userName,fileUrl, fileName, companyId",
          400
        )
      );
    }

    // Check if project exists
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnapshot = await projectRef.get();
    if (!projectSnapshot.exists) {
      return next(new ErrorHandler("Project not found", 400));
    }

    // Check if document exists
    const documentRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files")
      .doc(documentId);
    const documentSnapshot = await documentRef.get();
    if (!documentSnapshot.exists) {
      return next(new ErrorHandler("Document not found", 400));
    }

    // Check if user exists
    const userRef = db.collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return next(new ErrorHandler("User not found", 400));
    }

    // Record submission in file_submissions collection
    const submissionCollection = db.collection("file_submissions");
    const submissionDoc = {
      projectId,
      documentId,
      userId,
      userName,
      fileUrl,
      fileName,
      companyId,
      submissionDate: new Date(),
    };

    const submissionRef = await submissionCollection.add(submissionDoc);

    res.status(201).send({
      success: true,
      message: "File submission recorded successfully",
      submissionId: submissionRef.id,
      ...submissionDoc,
    });
  } catch (error) {
    console.error("Error recording file submission:", error);
    next(error);
  }
};

// Fetch submission history for a document
exports.fetchSubmissionHistory = async (req, res, next) => {
  const { projectId, documentId } = req.query;

  try {
    // Validate required fields
    if (!projectId || !documentId) {
      return next(
        new ErrorHandler("Missing required fields: projectId, documentId", 400)
      );
    }

    // Check if project exists
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnapshot = await projectRef.get();
    if (!projectSnapshot.exists) {
      return next(new ErrorHandler("Project not found", 400));
    }

    // Check if document exists
    const documentRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files")
      .doc(documentId);
    const documentSnapshot = await documentRef.get();
    if (!documentSnapshot.exists) {
      return next(new ErrorHandler("Document not found", 400));
    }

    // Query submission history
    const submissionCollection = db.collection("file_submissions");
    const query = submissionCollection
      .where("projectId", "==", projectId)
      .where("documentId", "==", documentId);
    const submissionSnapshot = await query.get();

    const submissionHistory = submissionSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      submissionDate: doc.data().submissionDate
        ? doc.data().submissionDate
        : null,
    }));

    res.status(200).send(submissionHistory);
  } catch (error) {
    console.error("Error fetching submission history:", error);
    next(error);
  }
};
