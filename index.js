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
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Get directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

console.log('Files in parent directory:', fs.readdirSync(path.join(__dirname, '..')));
console.log('Static files directory:', distPath);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!JWT_SECRET_KEY) {
    console.error('JWT_SECRET_KEY is not set in environment variables');
    process.exit(1);
} else {
    console.log('JWT_SECRET_KEY is loaded:', JWT_SECRET_KEY);
}

// Function to generate a token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET_KEY, // Ensure this matches the key used for verification
    { expiresIn: '1h' } // Set appropriate expiry time
  );
};

/*
// Example user object
const user = {
  id: 1,
  role: 'admin'
};

// Generate a token
const token = generateToken(user);
console.log('Generated Token:', token);
*/

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

// Route to handle login and set token in cookie
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Assume authentication is successful and you have user details
  const user = { id: 10, email: 'admin@gmail.com', password: '12345', role: 'admin' }; // Example user object

  // Generate a token
  const token = generateToken(user);

  // Determine environment-specific cookie settings
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax' // SameSite setting based on environment
  };

  // Set the token in a secure cookie
  res.cookie('token', token, cookieOptions);

  res.json({ message: 'Logged in successfully' });
});


/* Middleware function to verify the JWT token
const verifyUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).send('Unauthorized: Missing Authorization Header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send('Unauthorized: Missing Token');
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET_KEY); // Verify token with the secret key
    req.user = verified;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).send('Unauthorized: Invalid Token');
  }
};*/

const verifyUser = (req, res, next) => {
  const token = req.cookies.token; // Get the token from cookies

  if (!token) {
    return res.status(401).send('Unauthorized: Missing Token');
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET_KEY); // Verify token with the secret key
    req.user = verified;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).send('Unauthorized: Invalid Token');
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
