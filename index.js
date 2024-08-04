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
const publicPath = path.join(__dirname, 'Public');

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
    { id: user.id, role: user.role, email: user.email },
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
  if (token) {
    jwt.verify(token, JWT_SECRET_KEY, (err ,decoded) => {
      if(err) return res.json({Status: false, Error: "Wrong Token"})
      req.id = decoded.email;
      req.role = decoded.role;
      next()
    })
  } else {
    return res.json({Status: false, Error: "Not Authenticated"})
  }
};

// Authentication check route
app.get('/verify', verifyUser, (req, res) => {
  console.log('Verification successful:', { role: req.user.role, id: req.user.id });
  return res.json({ Status: true, role: req.role, id: req.id });
});

app.use(express.json());
app.use(cookieParser());

// Serve static files from the dist and Public directory
app.use(express.static(distPath));
app.use('/Public', express.static(publicPath));

// API routes
app.use('/auth', adminRouter);
app.use('/employee', employeeRouter);
app.use('/recruitment', recruitmentRouter);
app.use('/payroll', payrollRouter);

// Route to handle login and set token in cookie
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Define a list of user roles and corresponding queries
  const queries = [
    { sql: "SELECT * FROM admin WHERE email = ?", role: 'admin' },
    { sql: "SELECT * FROM recruitment WHERE email = ?", role: 'recruitment' },
    { sql: "SELECT * FROM payroll WHERE email = ?", role: 'payroll' },
    { sql: "SELECT * FROM employee WHERE email = ?", role: 'employee' }
  ];

  for (const query of queries) {
    try {
      const [result] = await pool.query(query.sql, [email]);

      if (result.length > 0) {
        if (query.role === 'employee' && result[0].employee_status === 'Inactive') {
          return res.json({ loginStatus: false, Error: "Account Deactivated!" });
        }

        const isMatch = await bcryptjs.compare(password, result[0].password);
        if (!isMatch) {
          return res.json({ loginStatus: false, Error: "Invalid Email or Password" });
        }

        const { email, fname, lname, id } = result[0];
        const token = generateToken({ id, role: query.role, email });

        // Determine environment-specific cookie settings
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Secure cookies in production
          sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax' // SameSite setting based on environment
        };

        // Set the token in a secure cookie
        res.cookie('token', token, cookieOptions);

        return res.json({ loginStatus: true, role: query.role, id });
      }
    } catch (err) {
      console.error(`Query error for ${query.role}:`, err);
      return res.json({ loginStatus: false, Error: "Query error" });
    }
  }

  return res.json({ loginStatus: false, Error: "Check your credentials and Try Again." });
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