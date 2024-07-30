const express = require('express');
const { db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler')
const axios = require('axios');
const archiver = require('archiver');
const { fetchDocumentAndCreateZip } = require('../middleware/createZip')



// Route to get all documents for a specific project (company)
router.get('/:projectId/getDocuments', async (req, res) => {
    const { projectId } = req.params;

    try {
        // Access the 'files' subcollection inside the specific 'project' document
        const documentsRef = db.collection('projects').doc(projectId).collection('files');
        const snapshot = await documentsRef.get();

        if (snapshot.empty) {
            return next(new ErrorHandler("No documents found for this project.", 404));
           
        }

        // Extract document data
        const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        ErrorHandler.handleError(res, error);
    }
});

// Route to get a specific document by its ID
router.get('/:projectId/documentInfo/:documentId', async (req, res) => {
    const { projectId, documentId } = req.params;

    try {
        // Access the specific document in the 'files' subcollection inside the specific 'project' document
        const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
        const doc = await documentRef.get();

        if (!doc.exists) {
            return next(new ErrorHandler("Document Not found ", 404));

        }

        // Extract document data
        const document = { id: doc.id, ...doc.data() };

        res.status(200).json({ document });
    } catch (error) {
        console.error('Error fetching document:', error);
        ErrorHandler.handleError(res, error);
    }
});


router.get('/:projectId/:documentId/downloadDocx', async (req, res, next) => {
    const { projectId, documentId } = req.params;

    try {
        const { convertedFileBuffer, convertedFileName, pdfUrl, name } = await fetchDocumentAndCreateZip(projectId, documentId, 'docx');

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${name.replace('.pdf', '')}.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        // Append DOCX and PDF files to the zip
        archive.append(convertedFileBuffer, { name: convertedFileName });
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
        archive.append(pdfResponse.data, { name });

        archive.finalize();
    } catch (error) {
        console.error('Error exporting document:', error);
        next(error);
    }
});



router.get('/:projectId/:documentId/downloadPdf', async (req, res, next) => {
    const { projectId, documentId } = req.params;

    try {
        const { convertedFileBuffer, convertedFileName, pdfUrl, name } = await fetchDocumentAndCreateZip(projectId, documentId, 'pdf');

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${name.replace('.pdf', '')}.zip"`);

        
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        // Append the converted PDF buffer to the zip
        archive.append(convertedFileBuffer, { name: convertedFileName });

        // Fetch the original PDF and append it to the zip
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
        archive.append(pdfResponse.data, { name });

        await archive.finalize();
    } catch (error) {
        console.error('Error exporting document:', error);
        next(error);
    }
});



module.exports = router;
