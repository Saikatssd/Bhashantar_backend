const express = require('express');
require("dotenv").config({ path: "./config.env" });
const cors = require('cors');
const errorMiddleware = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/auth');
const roleRoutes = require('./routes/role');
const projectRoutes = require('./routes/project');
const companyRoutes = require('./routes/company');
const documentRoutes = require('./routes/document');
const permissionRoutes = require('./routes/permission');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Middleware
app.use(express.json());

const corsOptions = {
  origin: [process.env.FRONTEND_URL, "http://localhost:5173",'https://www.bhasantar.com', 'https://bhasantar.com','https://bhashantar-frontend.vercel.app','https://frontend-dot-bhasantar-ui-and-llm.as.r.appspot.com'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition"],
  credentials: true,
};

app.use(cors(corsOptions));


// Handle OPTIONS requests for CORS preflight checks
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(200);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/role', roleRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/permission', permissionRoutes);

app.use(errorMiddleware);

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GCP_PROJECT_ID,
});
const bucketName = process.env.GCS_BUCKET_NAME;
// console.log(bucketName)



app.post('/generateSignedUrl', async (req, res) => {
  const { projectId, fileName } = req.body;

  try {
    const filePath = `projects/${projectId}/${fileName}`; // Construct the file path in GCS
    const options = {
      version: 'v4',
      action: 'write', // Use 'write' for uploading
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
      contentType: 'application/pdf' // Set the appropriate content type
    };

    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(filePath)
      .getSignedUrl(options);

    res.json({ signedUrl, filePath }); // Return both the signed URL and file path
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

// app.post('/generateSignedReadUrl', async (req, res) => {
//   try {
//     const { filePath } = req.body; // Get the file path from the request body
    

//     if (!filePath) {
//       return res.status(400).json({ error: 'File path is required' });
//     }

//     // Generate a signed URL for reading the file
//     const [signedUrl] = await storage.bucket(bucketName).file(filePath).getSignedUrl({
//       version: 'v4',
//       action: 'read',
//       expires: Date.now() + 12 * 60 * 60 * 1000, // URL expires in 15 minutes
//     });

//     res.json({ signedUrl });
//   } catch (error) {
//     console.error('Error generating signed URL:', error);
//     res.status(500).json({ error: 'Error generating signed URL' });
//   }
// });




// app.post('/generateSignedUrl', async (req, res) => {
//   try {
//     const { projectId, fileName, action = 'write' } = req.body;
//     const options = {
//       version: 'v4',
//       action: action, // 'write' for upload, 'read' for download
//       expires: Date.now() + 60 * 60 * 1000 * 24, 
//       contentType: action === 'write' ? 'application/pdf' : undefined, // Set the content type for upload action
//     };

//     // Get a signed URL for file upload or download
//     const [url] = await storage
//       .bucket(bucketName)
//       .file(`projects/${projectId}/${fileName}`)
//       .getSignedUrl(options);

//     res.status(200).json({ signedUrl: url });
//   } catch (error) {
//     console.error('Error generating signed URL:', error);
//     res.status(500).send('Error generating signed URL');
//   }
// });
app.post('/generateReadSignedUrl', async (req, res) => {
  const { projectId, fileName, fileType } = req.body; // Include fileType in the request body

  try {
    // Determine the correct content type based on the fileType
    let contentType = '';
    if (fileType === 'pdf') {
      contentType = 'application/pdf';
    } else if (fileType === 'html') {
      contentType = 'text/html';
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    const action = contentType === 'text/html' ? 'read' : 'read';

    // Append the correct extension based on the fileType
    const filePath = `projects/${projectId}/${fileName}.${fileType}`;
    const options = {
      version: 'v4',
      action: action, // Use 'read' for downloading
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
    };

    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(filePath)
      .getSignedUrl(options);

    res.json({ signedUrl, filePath });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL for reading' });
  }
});


app.get('/', (req, res) => {
  res.send('Welcome to the Company and Project Management API');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
