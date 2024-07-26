const express = require('express');
const { db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler')
const axios = require('axios');
const htmlToDocx = require('html-to-docx');
const archiver = require('archiver');




// Route to get all documents for a specific project (company)
router.get('/:projectId/getDocuments', async (req, res) => {
    const { projectId } = req.params;

    try {
        // Access the 'files' subcollection inside the specific 'project' document
        const documentsRef = db.collection('projects').doc(projectId).collection('files');
        const snapshot = await documentsRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'No documents found for this project.' });
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
            return res.status(404).json({ message: 'Document not found.' });
        }

        // Extract document data
        const document = { id: doc.id, ...doc.data() };

        res.status(200).json({ document });
    } catch (error) {
        console.error('Error fetching document:', error);
        ErrorHandler.handleError(res, error);
    }
});





// router.get('/:projectId/:documentId/exportDoc', async (req, res, next) => {
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
//         const doc = await documentRef.get();

//         if (!doc.exists) {
//             return next(new ErrorHandler("Document Not Found", 404));
//         }

//         const { htmlUrl, pdfUrl, name } = doc.data();

//         // Fetch the HTML content
//         const htmlResponse = await axios.get(htmlUrl);
//         const htmlContent = htmlResponse.data;

        
//         console.log(htmlContent);

//         if (!htmlContent) {
//             return next(new ErrorHandler("HTML content is empty or undefined", 500));
//         }

//         // Define custom styles
//         const options = {
//             paragraphStyles: {
//                 spacing: {
//                     after: 120, // Space after paragraphs (in twips; 1/20th of a point)
//                     line: 240,  // Line height (in twips; 240 = 1.5 lines)
//                 },
//             },
//         };

//         // Convert HTML to DOCX with custom styles
//         const docxBuffer = await htmlToDocx(htmlContent, options).catch(err => {
//             throw new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500);
//         });

//         res.setHeader('Content-Type', 'application/zip');
//         res.setHeader('Content-Disposition', `attachment; filename="${name.replace('.pdf', '')}.zip"`);

//         const archive = archiver('zip', {
//             zlib: { level: 9 }
//         });

//         archive.on('error', (err) => {
//             throw err;
//         });

//         archive.pipe(res);

//         // Append DOCX and PDF files to the zip
//         archive.append(docxBuffer, { name: `${name.replace('.pdf', '.docx')}` });
//         const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
//         archive.append(pdfResponse.data, { name });

//         archive.finalize();

//     } catch (error) {
//         console.error('Error exporting document:', error);
//         next(error);
//     }
// });

router.get('/:projectId/:documentId/exportDoc', async (req, res, next) => {
    const { projectId, documentId } = req.params;

    try {
        const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
        const doc = await documentRef.get();

        if (!doc.exists) {
            return next(new ErrorHandler("Document Not Found", 404));
        }

        const { htmlUrl, pdfUrl, name } = doc.data();

        // Fetch the HTML content
        const htmlResponse = await axios.get(htmlUrl);
        let htmlContent = htmlResponse.data;

        if (!htmlContent) {
            return next(new ErrorHandler("HTML content is empty or undefined", 500));
        }

        // Replace custom page break comment with CSS-based page break
        htmlContent = htmlContent.replace(/<!-- my page break -->/g, '<div style="page-break-after: always;"></div>');

        // Define custom styles
        const options = {
            paragraphStyles: {
                spacing: {
                    after: 120, // Space after paragraphs (in twips; 1/20th of a point)
                    line: 600,  // Line height (in twips; 240 = 1.5 lines)
                },
            },
        };

        // Convert HTML to DOCX with custom styles
        const docxBuffer = await htmlToDocx(htmlContent, options).catch(err => {
            throw new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500);
        });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${name.replace('.pdf', '')}.zip"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(res);

        // Append DOCX and PDF files to the zip
        archive.append(docxBuffer, { name: `${name.replace('.pdf', '.docx')}` });
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
        archive.append(pdfResponse.data, { name });

        archive.finalize();

    } catch (error) {
        console.error('Error exporting document:', error);
        next(error);
    }
});




// router.get('/:projectId/:documentId/exportDoc', async (req, res, next) => {
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('files').doc(documentId);
//         const doc = await documentRef.get();

//         if (!doc.exists) {
//             return next(new ErrorHandler("Document Not Found", 404));
//         }

//         const { htmlUrl, pdfUrl, name } = doc.data();

//         // Fetch the HTML content
//         const htmlResponse = await axios.get(htmlUrl);
//         const htmlContent = htmlResponse.data;

//         if (!htmlContent) {
//             return next(new ErrorHandler("HTML content is empty or undefined", 500));
//         }

//         // Convert HTML to DOCX
//         const docxBuffer = await htmlToDocx(htmlContent).catch(err => {
//             throw new ErrorHandler("Error during HTML to DOCX conversion: " + err.message, 500);
//         });

//         // Set the response headers
//         res.setHeader('Content-Type', 'application/zip');
//         res.setHeader('Content-Disposition', `attachment; filename="${name.replace('.pdf', '')}.zip"`);

//         // Create a zip stream
//         const archive = archiver('zip', {
//             zlib: { level: 9 } // Set the compression level
//         });

//         archive.on('error', (err) => {
//             throw err;
//         });

//         // Pipe the archive to the response
//         archive.pipe(res);

//         // Append the PDF and DOCX files to the zip
//         archive.append(docxBuffer, { name: `${name.replace('.pdf', '.docx')}` });

//         // Fetch the PDF file as a stream and append it
//         const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
//         archive.append(pdfResponse.data, { name });

//         // Finalize the archive (i.e., close the stream)
//         archive.finalize();

//     } catch (error) {
//         console.error('Error exporting document:', error);
//         next(error);
//     }
// });





// // Endpoint to generate signed URL for document upload
// router.get('/:projectId/uploadUrl', async (req, res) => {
//     const { filename } = req.query;
//     const projectId = req.params.projectId;
//     const file = bucket.file(`projects/${projectId}/${filename}`);

//     const options = {
//         version: 'v4',
//         action: 'write',
//         expires: Date.now() + 15 * 60 * 1000, // 15 minutes
//     };

//     try {
//         const [url] = await file.getSignedUrl(options);
//         res.status(200).send({ url });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Endpoint to notify backend of document upload
// router.post('/:projectId/notifyUpload', async (req, res) => {
//     const { filename } = req.body;
//     const projectId = req.params.projectId;

//     try {
//         await db.collection('projects').doc(projectId).collection('documents').add({
//             filename,
//             status: 'ready-for-work',
//             createdAt: new Date(),
//         });
//         res.status(200).send({ message: 'Upload notified' });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// router.post('/:projectId/documents/:documentId/updateStatus', async (req, res) => {
//     const { status } = req.body;
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('documents').doc(documentId);
//         await documentRef.update({ status });
//         res.status(200).send({ message: 'Status updated' });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Endpoint to handle ML model processing (simplified)
// router.post('/:projectId/documents/:documentId/translate', async (req, res) => {
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('documents').doc(documentId);
//         const documentData = (await documentRef.get()).data();

//         // Simulate ML translation process
//         const translatedDocument = `Translated content of ${documentData.filename}`;

//         // Update document with translated content and move to 'ready-for-work'
//         await documentRef.update({ translatedDocument, status: 'ready-for-work' });
//         res.status(200).send({ message: 'Document translated' });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// router.post('/:projectId/documents/:documentId/complete', async (req, res) => {
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('documents').doc(documentId);
//         const documentData = (await documentRef.get()).data();
//         const completedFile = bucket.file(`completed/${projectId}/${documentData.filename}`);

//         // Move file to completed bucket
//         await bucket.file(`projects/${projectId}/${documentData.filename}`).move(completedFile);

//         // Update document status to completed
//         await documentRef.update({ status: 'completed' });
//         res.status(200).send({ message: 'Document completed and moved to download bucket' });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Endpoint to download completed documents
// router.get('/:projectId/documents/:documentId/download', async (req, res) => {
//     const { projectId, documentId } = req.params;

//     try {
//         const documentRef = db.collection('projects').doc(projectId).collection('documents').doc(documentId);
//         const documentData = (await documentRef.get()).data();

//         if (documentData.status !== 'completed') {
//             return res.status(400).send({ message: 'Document is not completed yet' });
//         }

//         const file = bucket.file(`completed/${projectId}/${documentData.filename}`);
//         const [url] = await file.getSignedUrl({
//             version: 'v4',
//             action: 'read',
//             expires: Date.now() + 15 * 60 * 1000, // 15 minutes
//         });

//         res.status(200).send({ url });
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });


module.exports = router;