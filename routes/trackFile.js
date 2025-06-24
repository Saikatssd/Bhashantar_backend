const express = require('express');
const router = express.Router();
const revertController = require('../controller/trackFileController');

router.post('/log', revertController.logRevertAction);
router.get('/history', revertController.fetchRevertHistory);

module.exports = router;