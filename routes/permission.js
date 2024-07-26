const express = require('express');
const { db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler')

// Permissions template
const permissions = {
    users: {
        read: false,
        create: false,
        update: false,
        delete: false
    },
    documents: {
        read: false,
        create: false,
        update: false,
        delete: false,
        assign: false
    }
};


// Create permission
router.post('/createPermission', async (req, res) => {
    const { roleId, permissions } = req.body;
    try {
        const roleDoc = await db.collection('roles').doc(roleId).get();
        if (!roleDoc.exists) {
          return next(new ErrorHandler('Role not found', 404));
        }

        const permissionsRef = db.collection('permissions').doc();
        await permissionsRef.set({
            roleId: roleId,
            permissions
        })
        await db.collection('roles').doc(roleId).update({
            permissionId: permissionsRef.id,
        });

        res.status(200).send('Permission created successfully');
    } catch (error) {
        res.status(500).send('Error creating permission:' + error.message);
    }
});


// Update permission
router.put('/updatePermission', async (req, res) => {
    // const { id } = req.body;
    const { roleId,permissions } = req.body;
    try {
        const roleDoc = await db.collection('roles').doc(roleId).get();
        if (!roleDoc.exists) {
          return next(new ErrorHandler('Role not found', 404));
        }
        const role = roleDoc.data();
        await db.collection('permissions').doc(role.permissionId).update({ permissions });
        res.status(200).send('Permission updated successfully');
    } catch (error) {
        res.status(500).send('Error updating permission: ' + error.message);
    }
});

//get all permissions
router.get('/getAllPermissions', async (req, res) => {
    try {
        const permissions = await db.collection('permissions').get();
        const permissionsDoc = permissions.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).send(permissionsDoc);
    } catch (error) {
        res.status(400).send(error);
    }
  });

module.exports = router;




// const express = require('express');
// const { db } = require('../firebaseAdmin');
// const router = express.Router();
// const ErrorHandler = require('../utils/errorHandler');
// const checkPermissions = require('../middleware/checkPermissions');

// // Permissions template
// const permissions = {
//   users: {
//     read: false,
//     create: false,
//     update: false,
//     delete: false
//   },
//   documents: {
//     read: false,
//     create: false,
//     update: false,
//     delete: false,
//     assign: false
//   }
// };

// // Create permission
// router.post('/createPermission', checkPermissions({ users: 'create' }), async (req, res, next) => {
//   const { roleId, permissions } = req.body;
//   try {
//     const roleDoc = await db.collection('roles').doc(roleId).get();
//     if (!roleDoc.exists) {
//       return next(new ErrorHandler('Role not found', 404));
//     }

//     const permissionsRef = db.collection('permissions').doc();
//     await permissionsRef.set({
//       roleId: roleId,
//       permissions
//     });

//     await db.collection('roles').doc(roleId).update({
//       permissionId: permissionsRef.id,
//     });

//     res.status(200).send('Permission created successfully');
//   } catch (error) {
//     next(new ErrorHandler('Error creating permission: ' + error.message, 500));
//   }
// });

// // Update permission
// router.put('/updatePermission', checkPermissions({ users: 'update' }), async (req, res, next) => {
//   const { roleId, permissions } = req.body;
//   try {
//     const roleDoc = await db.collection('roles').doc(roleId).get();
//     if (!roleDoc.exists) {
//       return next(new ErrorHandler('Role not found', 404));
//     }

//     const role = roleDoc.data();
//     await db.collection('permissions').doc(role.permissionId).update({ permissions });

//     res.status(200).send('Permission updated successfully');
//   } catch (error) {
//     next(new ErrorHandler('Error updating permission: ' + error.message, 500));
//   }
// });

// // Get all permissions
// router.get('/getAllPermissions', checkPermissions({ users: 'read' }), async (req, res, next) => {
//   try {
//     const permissionsSnapshot = await db.collection('permissions').get();
//     const permissionsDoc = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//     res.status(200).send(permissionsDoc);
//   } catch (error) {
//     next(new ErrorHandler('Error retrieving permissions: ' + error.message, 500));
//   }
// });

// module.exports = router;
