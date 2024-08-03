import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { adminRouter } from './Routes/AdminRouter.js';
import { employeeRouter } from './Routes/EmployeeRouter.js';
import { recruitmentRouter } from './Routes/RecruitmentRouter.js';
import { payrollRouter } from './Routes/PayrollRouter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist'); // Adjusted path for the backend directory

console.log('Files in parent directory:', fs.readdirSync(path.join(__dirname, '..')));
console.log('Static files directory:', distPath);

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || b42bdb5c4cd8a748403c0f78169416b066127336a22227e66ead5eccc6502b1e;

if (!JWT_SECRET_KEY) {
    console.error('JWT_SECRET_KEY is not set in environment variables');
} else {
    console.log('JWT_SECRET_KEY is loaded:', JWT_SECRET_KEY);
}

app.use(cors({
  origin: 'https://hrais-rcramoscc-client.onrender.com',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true // Allow sending cookies and authorization headers
}));

app.use(express.json());
app.use(cookieParser());

// Serve static files from the dist directory
app.use(express.static(distPath));

// API routes
app.use('/auth', adminRouter);
app.use('/employee', employeeRouter);
app.use('/recruitment', recruitmentRouter);
app.use('/payroll', payrollRouter);

// Middleware function to verify the JWT token
const verifyUser = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
      return res.status(401).send('Access Denied: No Token Provided!');
  }

  try {
      const verified = jwt.verify(token, JWT_SECRET_KEY);
      req.user = verified;
      next();
  } catch (error) {
      console.error('Token verification error:', error);
      res.status(400).send('Invalid Token');
  }
};


// Authentication check route
app.get('/verify', verifyUser, (req, res) => {
  console.log('Verification successful:', { role: req.user.role, id: req.user.id });
  return res.json({ Status: true, role: req.user.role, id: req.user.id });
});

// Serve the index.html for all other routes
app.get('*', (req, res) => {
  const filePath = path.join(distPath, 'index.html');
  console.log(`Attempting to serve file at: ${filePath}`);
  fs.readdir(distPath, (err, files) => {
    if (err) {
      console.error('Error reading dist directory:', err);
    } else {
      console.log('Files in dist directory:', files);
    }
  });
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
