const express = require("express");
const { db } = require("../firebaseAdmin");
const router = express.Router();
const ErrorHandler = require("../utils/errorHandler");
const axios = require("axios");
const archiver = require("archiver");
const { fetchDocumentAndCreateZip } = require("../middleware/createZip");
const { Storage } = require("@google-cloud/storage");



const storage = new Storage();
const bucketName = "bhasantar";

router.post("/deleteFile", async (req, res, next) => {
  const { projectId, fileName } = req.body;
  if (!projectId || !fileName) {
    // console.log(projectId, fileName);
    return next(new ErrorHandler("No documents found for this project.", 404));
  }
  // console.log(projectId, fileName);

  try {
    const fileRef = storage
      .bucket(bucketName)
      .file(`projects/${projectId}/${fileName}`);
    await fileRef.delete();

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Error deleting file" });
  }
});

// Route to get all documents for a specific project (company)
router.get("/:projectId/getDocuments", async (req, res) => {
  const { projectId } = req.params;

  try {
    // Access the 'files' subcollection inside the specific 'project' document
    const documentsRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files");
    const snapshot = await documentsRef.get();

    if (snapshot.empty) {
      return next(
        new ErrorHandler("No documents found for this project.", 404)
      );
    }

    // Extract document data
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    ErrorHandler.handleError(res, error);
  }
});

// Route to get a specific document by its ID
router.get("/:projectId/documentInfo/:documentId", async (req, res) => {
  const { projectId, documentId } = req.params;

  try {
    // Access the specific document in the 'files' subcollection inside the specific 'project' document
    const documentRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files")
      .doc(documentId);
    const doc = await documentRef.get();

    if (!doc.exists) {
      return next(new ErrorHandler("Document Not found ", 404));
    }

    // Extract document data
    const document = { id: doc.id, ...doc.data() };

    res.status(200).json({ document });
  } catch (error) {
    console.error("Error fetching document:", error);
    ErrorHandler.handleError(res, error);
  }
});

// router.get("/:projectId/:documentId/downloadDocx", async (req, res, next) => {
//   const { projectId, documentId } = req.params;

//   try {
//     const { convertedFileBuffer, convertedFileName, pdfUrl, name } =
//       await fetchDocumentAndCreateZip(projectId, documentId, "docx");

//     res.setHeader("Content-Type", "application/zip");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${name.replace(".pdf", "")}.zip"`
//     );

//     const archive = archiver("zip", { zlib: { level: 0 } });
//     archive.on("error", (err) => {
//       throw err;
//     });
//     archive.pipe(res);

//     // Append DOCX and PDF files to the zip
//     archive.append(convertedFileBuffer, { name: convertedFileName });
//     const pdfResponse = await axios.get(pdfUrl, { responseType: "stream" });
//     archive.append(pdfResponse.data, { name });

//     archive.finalize();
//   } catch (error) {
//     console.error("Error exporting document:", error);
//     next(error);
//   }
// });

// Download DOCX with original PDF included in the ZIP
router.get("/:projectId/:documentId/downloadDocx", async (req, res, next) => {
  const { projectId, documentId } = req.params;

  try {
    const { convertedFileBuffer, convertedFileName, pdfFilePath, name } =
      await fetchDocumentAndCreateZip(projectId, documentId, "docx");

    const bucket = storage.bucket(bucketName);
    
    // Generate a signed URL for the original PDF file
    const [pdfSignedUrl] = await bucket.file(pdfFilePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
    });

    // Set headers for zip download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${name.replace(".pdf", "")}.zip"`
    );

    // Create a ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    // Add converted DOCX file to the zip
    archive.append(convertedFileBuffer, { name: convertedFileName });

    // Fetch and add original PDF using the signed URL
    const pdfResponse = await axios.get(pdfSignedUrl, { responseType: 'stream' });
    archive.append(pdfResponse.data, { name });

    await archive.finalize();
  } catch (error) {
    console.error("Error exporting DOCX document:", error);
    next(error);
  }
});

// Download PDF with original PDF included in the ZIP
router.get("/:projectId/:documentId/downloadPdf", async (req, res, next) => {
  const { projectId, documentId } = req.params;

  try {
    const { convertedFileBuffer, convertedFileName, pdfFilePath, name } =
      await fetchDocumentAndCreateZip(projectId, documentId, "pdf");

    const bucket = storage.bucket(bucketName);
    
    // Generate a signed URL for the original PDF file
    const [pdfSignedUrl] = await bucket.file(pdfFilePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
    });

    // Set headers for zip download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${name.replace(".pdf", "")}.zip"`
    );

    // Create a ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    // Add converted PDF file to the zip
    archive.append(convertedFileBuffer, { name: convertedFileName });

    // Fetch and add original PDF using the signed URL
    const pdfResponse = await axios.get(pdfSignedUrl, { responseType: 'stream' });
    archive.append(pdfResponse.data, { name });

    await archive.finalize();
  } catch (error) {
    console.error("Error exporting PDF document:", error);
    next(error);
  }
});


// router.get("/:projectId/:documentId/downloadPdf", async (req, res, next) => {
//   const { projectId, documentId } = req.params;

//   try {
//     const { convertedFileBuffer, convertedFileName, pdfUrl, name } =
//       await fetchDocumentAndCreateZip(projectId, documentId, "pdf");

//     res.setHeader("Content-Type", "application/zip");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="${name.replace(".pdf", "")}.zip"`
//     );

//     const archive = archiver("zip", { zlib: { level: 1 } });
//     archive.on("error", (err) => {
//       throw err;
//     });
//     archive.pipe(res);

//     // Append the converted PDF buffer to the zip
//     archive.append(convertedFileBuffer, { name: convertedFileName });

//     // Fetch the original PDF and append it to the zip
//     const pdfResponse = await axios.get(pdfUrl, { responseType: "stream" });
//     archive.append(pdfResponse.data, { name });

//     await archive.finalize();
//   } catch (error) {
//     console.error("Error exporting document:", error);
//     next(error);
//   }
// });

router.put('/generateSignedUrlForHtmlUpdate', async (req, res) => {
  const { projectId, fileId } = req.body;

  try {
    // Fetch the file metadata from Firestore
    const fileDocRef = db
      .collection("projects")
      .doc(projectId)
      .collection("files")
      .doc(fileId); // Get the specific file by fileId
    const fileDoc = await fileDocRef.get();

    // Check if the document exists
    if (!fileDoc.exists) {
      return res.status(404).json({ error: 'File does not exist' });
    }

    // Get the file data
    const fileData = fileDoc.data();
    const htmlFileName = fileData.name.replace('.pdf', '.html');
    const gcsFilePath = `projects/${projectId}/${htmlFileName}`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsFilePath);

    // Generate a signed URL for the HTML file with "write" permission
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
      contentType: 'text/html', // Ensure the content type matches
    });

    res.json({ signedUrl, gcsFilePath });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL for HTML update' });
  }
});




module.exports = router;
