
const express = require('express');
const { auth, db } = require('../firebaseAdmin');
const router = express.Router();
const ErrorHandler = require('../utils/errorHandler');
const verifyToken = require('../middleware/verifyToken');


// router.post('/createUser', async (req, res, next) => {
//   const { name, email, password, phoneNo, roleId, companyId } = req.body;

//   try {
//     // Check if the role exists
//     const roleRef = db.collection('roles').doc(roleId);
//     const roleSnapshot = await roleRef.get();
//     if (!roleSnapshot.exists) {
//       return next(new ErrorHandler("Role Not Found", 400));
//     }

//     // Check if the company exists
//     const companyRef = db.collection('companies').doc(companyId);
//     const companySnapshot = await companyRef.get();
//     if (!companySnapshot.exists) {
//       return next(new ErrorHandler("Company Not Found", 400));
//     }

//     // Check if the user already exists
//     let userExists = false;
//     try {
//       await auth.getUserByEmail(email);
//       userExists = true;
//     } catch (error) {
//       if (error.code !== 'auth/user-not-found') {
//         throw error;
//       }
//     }

//     if (userExists) {
//       return next(new ErrorHandler("User already exists with this email", 400));
//     }

//     // Create the user in Firebase Authentication
//     const userRecord = await auth.createUser({ email, password });


//     // Save user data to Firestore
//     await db.collection('users').doc(userRecord.uid).set({
//       name,
//       email: userRecord.email,
//       phoneNo,
//       roleId,
//       companyId,
//       isActive: true,
//       createdAt: new Date(),
//     });
//     const userDoc = await db.collection('users').doc(userRecord.uid).get();
//     const userData = userDoc.data();
//     res.status(201).send({ uid: userRecord.uid, name, ...userData });
//   } catch (error) {
//     console.error('Error creating user:', error);
//     next(error)
//     // res.status(400).send({ error: error.message });
//   }
// });


router.post('/createUser', async (req, res, next) => {
  const { name, email, password, phoneNo, roleId, companyId } = req.body;

  try {
    // Check if the role exists
    const roleRef = db.collection('roles').doc(roleId);
    const roleSnapshot = await roleRef.get();
    if (!roleSnapshot.exists) {
      return next(new ErrorHandler("Role Not Found", 400));
    }
    const roleName = roleSnapshot.data().name;
    // console.log('rolename',roleName)

    // Check if the company exists
    const companyRef = db.collection('companies').doc(companyId);
    const companySnapshot = await companyRef.get();
    if (!companySnapshot.exists) {
      return next(new ErrorHandler("Company Not Found", 400));
    }
    const companyName = companySnapshot.data().name;
    // console.log('companyName',companyName)


    // Check if the user already exists
    let userExists = false;
    try {
      await auth.getUserByEmail(email);
      userExists = true;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (userExists) {
      return next(new ErrorHandler("User already exists with this email", 400));
    }

    // Create the user in Firebase Authentication
    const userRecord = await auth.createUser({ email, password });

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { companyId, companyName, roleName });

    // Save user data to Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email: userRecord.email,
      phoneNo,
      roleId,
      companyId,
      isActive: true,
      createdAt: new Date(),
    });

    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.status(201).send({ uid: userRecord.uid, name, ...userData });
  } catch (error) {
    console.error('Error creating user:', error);
    next(error);
  }
});



router.post('/registerSuperAdmin', async (req, res, next) => {
  const { name, email, password, phoneNo, roleId } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Missing Required Fields ", 400));

  }

  const roleRef = db.collection('roles').doc(roleId);
  const roleSnapshot = await roleRef.get();

  if (!roleSnapshot.exists) {
    return next(new ErrorHandler("Role Not Found", 400));
  }

  try {
    const userRecord = await auth.createUser({ email, password });

    await db.collection('users').doc(userRecord.uid).set({
      name: name,
      email: userRecord.email,
      phoneNo: phoneNo,
      roleId: roleId,
      companyId: null,
      isActive: true,
      createdAt: new Date(),
    });


    res.status(201).send('Initial SuperAdmin registered successfully');
  } catch (error) {
    console.error('Error registering initial SuperAdmin:', error);
    res.status(400).send(error.message);
  }
});


// router.get('/getUserProfile',verifyToken, async (req, res) => {
//   try {
//     const currentUser = await auth.currentUser();

//     if (!currentUser) {
//       return res.status(401).send('Unauthorized: Please sign in to access your profile');
//     }

//     const userRef = db.collection('users').doc(currentUser.uid);
//     if (!userRef.exists) {
//       return next(new ErrorHandler("User Not Found ", 400));

//     }
//     // const userRef = db.collection('users').doc('7ldaHVCzrgYLgJVnpTW33NSbdbe2');

//     const userDoc = await userRef.get();

//     // if (userDoc.exists) {
//     const userData = userDoc.data();
//     const userProfile = {
//       email: userData.email,
//       role: userData.role,
//       companyId: userData.companyId,
//     };
//     return res.status(200).send(userProfile);
//     // } 
//   } catch (error) {
//     console.error('Error retrieving user profile:', error);
//     return res.status(500).send('Internal server error');
//   }
// });


router.get('/getUserProfile', verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // Fetch the user document
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`User with UID ${uid} not found`);
      return next(new ErrorHandler("User Not Found", 400));
    }

    const userData = userDoc.data();

    // Fetch the role document
    const roleRef = db.collection('roles').doc(userData.roleId);
    const roleDoc = await roleRef.get();
    if (!roleDoc.exists) {
      console.error(`Role with ID ${userData.roleId} not found`);
      return next(new ErrorHandler("Role Not Found", 400));
    }
    const roleData = roleDoc.data();

    // Fetch the company document

    // if (userData.companyId) {

    //   const companyRef = db.collection('companies').doc(userData.companyId);
    //   const companyDoc = await companyRef.get();
    //   const companyData = companyDoc.data();
    // }

    const userProfile = {
      name: userData.name,
      email: userData.email,
      role: userData.roleId.roleName,
      roleName: roleData.name,
      companyId: userData.companyId,
      // companyName: companyData.name,
    };

    return res.status(200).send(userProfile);
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    return res.status(500).send('Internal server error');
  }
});


// Disable a user
router.post('/disableUser', async (req, res, next) => {
  const { userId } = req.body;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return next(new ErrorHandler('User not found', 404));
    }

    await userRef.update({ disabled: true });
    res.status(200).send('User disabled successfully');
  } catch (error) {
    next(new ErrorHandler('Error disabling user: ' + error.message, 500));
  }
});


module.exports = router;

