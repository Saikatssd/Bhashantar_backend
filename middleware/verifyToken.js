// const admin = require('../firebaseAdmin');

// const verifyToken = async (req, res, next) => {
//   const idToken = req.headers.authorization;

//   if (!idToken) {
//     return res.status(401).send('Unauthorized');
//   }

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(idToken);
//     req.user = decodedToken;
//     next();
//   } catch (error) {
//     return res.status(401).send('Unauthorized');
//   }
// };

// module.exports = verifyToken;

const { auth } = require('../firebaseAdmin');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: Missing or invalid token');
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return res.status(401).send('Unauthorized: Invalid token');
  }
};

module.exports = verifyToken;
