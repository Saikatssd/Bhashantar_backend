const express = require('express');
const router = express.Router();
const revertController = require('../controller/trackFileController');

router.post('/revert', revertController.logRevertAction);
router.get('/revert-history', revertController.fetchRevertHistory);


router.post('/file-submission', revertController.recordFileSubmission);
router.get('/file-submission-history', revertController.fetchSubmissionHistory);

router.post('/feedback', revertController.submitFeedback);
router.get('/feedbacks', revertController.fetchFeedbacks);
router.put('/feedback/status', revertController.updateFeedbackStatus);

module.exports = router;