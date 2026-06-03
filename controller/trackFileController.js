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

// Submit feedback for a document (creates entry in feedbacks collection)
exports.submitFeedback = async (req, res, next) => {
  const { projectId, documentId, fileName, userId, companyId, qualityRating, reason, notes } = req.body;

  try {
    // Validate required fields
    if (!projectId || !documentId || !fileName || !userId || !companyId || !qualityRating) {
      return next(
        new ErrorHandler(
          "Missing required fields: projectId, documentId, fileName, userId, companyId, qualityRating",
          400
        )
      );
    }

    // Validate quality rating value
    const validRatings = ["good", "poor", "average", "outstanding"];
    if (!validRatings.includes(qualityRating)) {
      return next(
        new ErrorHandler(
          "Invalid qualityRating value. Must be one of: good, poor, average, outstanding",
          400
        )
      );
    }

    // Validate reason for poor/average
    if ((qualityRating === "poor" || qualityRating === "average") && (!reason || !reason.trim())) {
      return next(
        new ErrorHandler(
          "Reason is required when qualityRating is poor or average",
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

    // Record feedback in feedbacks collection
    const feedbackCollection = db.collection("feedbacks");
    const feedbackDoc = {
      projectId,
      documentId,
      fileName,
      userId,
      companyId,
      qualityRating,
      reason: (qualityRating === "poor" || qualityRating === "average") ? reason.trim() : "",
      notes: notes || "",
      status: "pending",
      submittedAt: new Date(),
    };

    const feedbackRef = await feedbackCollection.add(feedbackDoc);

    res.status(201).send({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: feedbackRef.id,
      ...feedbackDoc,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    next(error);
  }
};

// Fetch feedbacks for a company (Kyrotics sees all feedbacks)
exports.fetchFeedbacks = async (req, res, next) => {
  const { companyId } = req.query;

  try {
    const feedbackCollection = db.collection("feedbacks");
    let query = feedbackCollection;

    if (companyId) {
      // Check if company is Kyrotics
      const companyRef = db.collection("companies").doc(companyId);
      const companySnapshot = await companyRef.get();

      if (companySnapshot.exists) {
        const companyData = companySnapshot.data();
        if (companyData.name !== "Kyrotics") {
          query = query.where("companyId", "==", companyId);
        }
      }
    }

    const feedbackSnapshot = await query.get();
    const feedbacks = feedbackSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
    }));

    // Sort in memory by submittedAt descending to avoid composite index requirement
    feedbacks.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt) : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt) : 0;
      return dateB - dateA;
    });

    res.status(200).send(feedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    next(error);
  }
};

// Update feedback status
exports.updateFeedbackStatus = async (req, res, next) => {
  const { feedbackId, status } = req.body;

  try {
    if (!feedbackId || !status) {
      return next(new ErrorHandler("Missing feedbackId or status", 400));
    }

    const validStatuses = ["pending", "reviewed", "under_review", "resolved"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return next(new ErrorHandler("Invalid status value", 400));
    }

    const feedbackRef = db.collection("feedbacks").doc(feedbackId);
    const feedbackDoc = await feedbackRef.get();

    if (!feedbackDoc.exists) {
      return next(new ErrorHandler("Feedback not found", 400));
    }

    await feedbackRef.update({
      status: status.toLowerCase(),
      updatedAt: new Date(),
    });

    res.status(200).send({
      success: true,
      message: "Feedback status updated successfully",
      feedbackId,
      status: status.toLowerCase(),
    });
  } catch (error) {
    console.error("Error updating feedback status:", error);
    next(error);
  }
};
