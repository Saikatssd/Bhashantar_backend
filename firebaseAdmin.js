const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // storageBucket: "kyrotics.appspot.com"
    databaseURL: "https://kyrotics.firebaseio.com"
});

const auth = admin.auth();
const db = admin.firestore();

module.exports = { auth, db };
