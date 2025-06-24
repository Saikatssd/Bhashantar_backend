const express = require('express');
const router = express.Router();
const revertController = require('../controller/trackFileController');

router.post('/revert', revertController.logRevertAction);
router.get('/revert-history', revertController.fetchRevertHistory);


router.post('/file-submission', revertController.recordFileSubmission);
router.get('/file-submission-history', revertController.fetchSubmissionHistory);

module.exports = router;