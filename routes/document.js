const express = require("express");
const router = express.Router();
const documentController = require('../controller/documentController');


// Route to get all documents for a specific project (company)
router.get("/:projectId/getDocuments", documentController.getDocuments);

// Route to get a specific document by its ID
router.get("/:projectId/documentInfo/:documentId", documentController.documentInfo);

router.put('/generateSignedUrlForHtmlUpdate', documentController.updateDocument);

router.post("/deleteFile", documentController.deleteFile);

router.get("/:projectId/:documentId/downloadDocx", documentController.downloadDocx);

// Download PDF with original PDF included in the ZIP
router.get("/:projectId/:documentId/downloadPdf", documentController.downloadPdf);


router.post("/downloadSelected", documentController.downloadSelectedFiles);


module.exports = router;
