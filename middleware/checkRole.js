// middleware/checkRole.js

const { auth, db } = require('../firebaseAdmin');
const ErrorHandler = require('../utils/errorHandler');

const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await auth.getUser(req.user.uid); // Assuming req.user.uid contains the authenticated user's UID
      const userDoc = await db.collection('users').doc(user.uid).get();

      if (!userDoc.exists) {
        return next(new ErrorHandler("User not found", 404));
      }

      const userData = userDoc.data();

      if (!allowedRoles.includes(userData.roleId)) {
        return next(new ErrorHandler("Forbidden: You don't have permission to access this resource", 403));
      }

      req.userData = userData; 
      next();
    } catch (error) {
      console.error('Error in role checking middleware:', error);
      next(new ErrorHandler("Internal server error", 500));
    }
  };
};

module.exports = checkRole;
