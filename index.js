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
import con from './utils/db.js'; // Ensure this import is correct
import fs from 'fs';

// Get directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist'); // Adjusted path for the backend directory

console.log('Files in parent directory:', fs.readdirSync(path.join(__dirname, '..')));
console.log('Static files directory:', distPath);

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_secret_key';

// CORS configuration
app.use(cors({
    origin: "https://hrais-rcramoscc-client.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));  

app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/auth', adminRouter);
app.use('/employee', employeeRouter);
app.use('/recruitment', recruitmentRouter);
app.use('/payroll', payrollRouter);

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(401).json({ Status: false, Error: "Invalid token" });
            }
            req.id = decoded.id;
            req.role = decoded.role;
            next();
        });
    } else {
        return res.status(401).json({ Status: false, Error: "Not Authenticated" });
    }
};

// Authentication check route
app.get('/verify', verifyUser, (req, res) => {
    return res.json({ Status: true, role: req.role, id: req.id });
});

app.use(express.static(distPath));

console.log('Static files directory:', distPath);

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
