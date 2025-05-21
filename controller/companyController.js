const express = require('express');
const { db } = require('../firebaseAdmin');
const ErrorHandler = require('../utils/errorHandler')

// Endpoint to create new company
exports.createCompany = async (req, res) => {
    const { name } = req.body;
    try {
        const companyRef = db.collection('companies').doc();
        await companyRef.set({
            // id: companyRef.id,
            name,
            createdAt: new Date(),
        });
        res.status(201).send({ name, id: companyRef.id });
    } catch (error) {
        res.status(400).send(error);
    }
};
exports.deleteCompany = async (req, res, next) => {
    const { id } = req.body;
    try {
        const company = await db.collection('companies').doc(id).get();
        if (!company.exists) {
            return next(new ErrorHandler('Company not found', 404));
        }

        await db.collection('companies').doc(id).delete();
        res.status(200).send('Company deleted successfully');
    } catch (error) {
        next(new ErrorHandler('Error deleting roleCompany ' + error.message, 500));
    }
};

// Endpoint to fetch all companies
exports.getCompanies = async (req, res) => {
    try {
        const companiesSnapshot = await db.collection('companies').get();
        const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).send(companies);
    } catch (error) {
        res.status(400).send(error);
    }
};


// Route to get users for a company
exports.getCompanyUsers = async (req, res) => {
    const { companyId } = req.params;

    try {
        const companyRef = db.collection('companies').doc(companyId);
        const companyDoc = await companyRef.get();

        const companyData = companyDoc.exists ? companyDoc.data() : null;

        const usersRef = db.collection('users').where('companyId', '==', companyId);
        const usersSnapshot = await usersRef.get();

        const users = usersSnapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            // email: doc.data().email,
            // role: doc.data().role,
            // companyId: companyId,
        }));

        const response = {
            users,
            company: companyData || null
        };

        res.status(200).send(response);
    } catch (error) {
        console.error('Error retrieving company users:', error);
        res.status(500).send('Internal server error');
    }
};



// Get all users in a company
exports.getAllUsersInCompany = async (req, res, next) => {
    const { companyId } = req.body;
    //   const { companyId } = req.query;

    if (!companyId) {
        return next(new ErrorHandler("Company ID is required", 400));
    }

    try {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnapshot = await companyRef.get();

        if (!companySnapshot.exists) {
            return next(new ErrorHandler("Company Not Found", 400));
        }

        const companyData = companySnapshot.data();
        const companyName = companyData.name;

        const usersQuerySnapshot = await db.collection('users').where('companyId', '==', companyId).get();
        if (usersQuerySnapshot.empty) {
            return res.status(200).json({ users: [] });
        }

        const users = [];
        for (const doc of usersQuerySnapshot.docs) {
            const userData = doc.data();
            const roleRef = db.collection('roles').doc(userData.roleId);
            const roleSnapshot = await roleRef.get();

            if (!roleSnapshot.exists) {
                return next(new ErrorHandler("Role Not Found", 400));
            }

            const roleData = roleSnapshot.data();
            users.push({
                uid: doc.id,
                name: userData.name,
                email: userData.email,
                phoneNo: userData.phoneNo,
                roleName: roleData.name,
                companyId: userData.companyId,
                companyName: companyName
            });
        }

        return res.status(200).json({ users });
    } catch (error) {
        console.error('Error retrieving users:', error);
        return next(new ErrorHandler('Internal server error', 500));
    }
};



