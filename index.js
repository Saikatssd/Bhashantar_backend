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

const app = express();

// Middleware
app.use(express.json());

const corsOptions = {
  origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
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

app.get('/', (req, res) => {
  res.send('Welcome to the Company and Project Management API');
});

const PORT = process.env.PORT || 5566;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
