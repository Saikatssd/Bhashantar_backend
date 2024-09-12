const express = require('express');
const { db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler')
const companyController = require('../controller/companyController')

// Endpoint to create new company
router.post('/createCompany', companyController.createCompany);
router.delete('/deleteCompany', companyController.deleteCompany);

// Endpoint to fetch all companies
router.get('/', companyController.getCompanies);

// Route to get users for a company
router.get('/getCompanyUsers/:companyId', companyController.getCompanyUsers);

// Get all users in a company
router.get('/getAllUsersInCompany', companyController.getAllUsersInCompany);


module.exports = router;
