const express = require("express");
const router = express.Router();
const folderController = require("../controller/folderController");

router.get("/getAllFolders/:projectId", folderController.getAllFolders);
router.post("/createFolder", folderController.createFolder);
router.get("/getFilesByFolder", folderController.getFilesByFolder);


module.exports = router;
