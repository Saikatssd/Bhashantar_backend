const { db } = require('../firebaseAdmin');
const ErrorHandler = require('../utils/errorHandler');

// Middleware to check permissions
const checkPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid; // Assume user ID is available in req.user
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return next(new ErrorHandler('User not found', 404));
      }

      const userData = userDoc.data();
      const roleDoc = await db.collection('roles').doc(userData.roleId).get();

      if (!roleDoc.exists) {
        return next(new ErrorHandler('Role not found', 404));
      }

      const roleData = roleDoc.data();
      const permissionDoc = await db.collection('permissions').doc(roleData.permissionId).get();

      if (!permissionDoc.exists) {
        return next(new ErrorHandler('Permissions not found', 404));
      }

      const userPermissions = permissionDoc.data().permissions;
      const hasPermission = Object.keys(requiredPermissions).every(key => {
        return userPermissions[key] && userPermissions[key][requiredPermissions[key]];
      });

      if (!hasPermission) {
        return next(new ErrorHandler('Insufficient permissions', 403));
      }

      next();
    } catch (error) {
      next(new ErrorHandler('Error checking permissions: ' + error.message, 500));
    }
  };
};

module.exports = checkPermissions;



// const { db } = require('../firebaseAdmin');

// const checkPermission = (permission) => {
//   return async (req, res, next) => {
//     const userId = req.user.uid; // Assuming user ID is stored in req.user
//     try {
//       const userDoc = await db.collection('users').doc(userId).get();
//       const userData = userDoc.data();
//       const roleDoc = await db.collection('roles').doc(userData.roleId).get();
//       const roleData = roleDoc.data();
      
//       if (roleData.permissions.includes(permission)) {
//         next();
//       } else {
//         res.status(403).send('Permission denied');
//       }
//     } catch (error) {
//       res.status(500).send('Error checking permissions: ' + error.message);
//     }
//   };
// };

// module.exports = checkPermission;
