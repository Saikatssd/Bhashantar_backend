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



//  get all documents for a specific project (company)
exports.getDocuments = async (req, res) => {
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
};

//get a specific document by its ID
exports.documentInfo = async (req, res) => {
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

        const document = { id: doc.id, ...doc.data() };

        res.status(200).json({ document });
    } catch (error) {
        console.error("Error fetching document:", error);
        ErrorHandler.handleError(res, error);
    }
};

exports.updateDocument = async (req, res) => {
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
};


exports.deleteFile = async (req, res, next) => {
    const { projectId, fileName } = req.body;
    if (!projectId || !fileName) {
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
};




// Download DOCX with original PDF included in the ZIP
exports.downloadDocx = async (req, res, next) => {
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
        const archive = archiver("zip", { zlib: { level: 2 } });
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
};



// Download PDF with original PDF included in the ZIP
exports.downloadPdf = async (req, res, next) => { 
    const { projectId, documentId } = req.params;

    try {
        const { convertedFileBuffer, convertedFileName, pdfFilePath, name } =
            await fetchDocumentAndCreateZip(projectId, documentId, "pdf");

        // Debugging: Check if the buffer is valid
        if (!convertedFileBuffer || !Buffer.isBuffer(convertedFileBuffer)) {
            console.log("Invalid or non-buffer PDF content detected.");
            return next(new ErrorHandler("Converted PDF Buffer is invalid.", 400));
        }

        // console.log("Proceeding with ZIP creation.");
        // console.log("Converted PDF Buffer size:", convertedFileBuffer.length);

        const bucket = storage.bucket(bucketName);

        // Generate a signed URL for the original PDF file
        const [pdfSignedUrl] = await bucket.file(pdfFilePath).getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
        });

        // Ensure the signed URL exists
        if (!pdfSignedUrl) {
            return next(new ErrorHandler("Could not generate signed URL.", 500));
        }

        // Set headers for zip download
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${name.replace(".pdf", "")}.zip"`
        );

        // Create a ZIP archive
        const archive = archiver("zip", { zlib: { level: 0 } }); // No compression for binary data
        archive.on("error", (err) => {
            console.error("Archive creation failed:", err);
            return next(new ErrorHandler("Archive creation failed.", 500));
        });

        archive.pipe(res);

        // Add converted PDF file to the zip
        // console.log("Appending converted PDF buffer to the ZIP archive.");
        archive.append(convertedFileBuffer, { name: convertedFileName });

        // Fetch and add original PDF using the signed URL
        try {
            const pdfResponse = await axios.get(pdfSignedUrl, { responseType: 'stream' });
            archive.append(pdfResponse.data, { name });
        } catch (err) {
            console.error("Error fetching original PDF:", err);
            return next(new ErrorHandler("Could not fetch original PDF.", 404));
        }

        // Finalize the zip
        await archive.finalize();

    } catch (error) {
        console.error("Error exporting PDF document:", error);
        return next(new ErrorHandler(error));
    }
};



// Multi-file download and zip handler
exports.downloadSelectedFiles = async (req, res, next) => {
    const { projectId, documentIds } = req.body; // Expecting an array of documentIds
  
    try {
      // Set up response for zip download
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="selected_files.zip"`);
  
      // Create a ZIP archive
      const archive = archiver('zip', { zlib: { level: 2 } });
      archive.on('error', (err) => {
        console.error('Error creating archive:', err);
        next(new ErrorHandler('Error creating ZIP archive.', 500));
      });
  
      archive.pipe(res);
  
      // Loop through document IDs and add their PDF and DOCX to individual folders
      for (const documentId of documentIds) {
        // Fetch the document and create the DOCX
        const { convertedFileBuffer, convertedFileName, pdfFilePath, name } =
          await fetchDocumentAndCreateZip(projectId, documentId, 'docx');
  
        const bucket = storage.bucket(bucketName);
  
        // Generate a signed URL for the original PDF
        const [pdfSignedUrl] = await bucket.file(pdfFilePath).getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
        });
  
        // Create a folder in the ZIP for this file
        const folderName = name.replace('.pdf', '');
        archive.append(convertedFileBuffer, { name: `${folderName}/${convertedFileName}` });
  
        // Fetch and add original PDF to the same folder
        const pdfResponse = await axios.get(pdfSignedUrl, { responseType: 'stream' });
        archive.append(pdfResponse.data, { name: `${folderName}/${name}` });
      }
  
      // Finalize the zip
      await archive.finalize();
    } catch (error) {
      console.error('Error downloading selected files:', error);
      next(new ErrorHandler('Error downloading selected files.', 500));
    }
  };



