import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { adminRouter } from './Routes/AdminRouter.js';
import { employeeRouter } from './Routes/EmployeeRouter.js';
import { recruitmentRouter } from './Routes/RecruitmentRouter.js';
import { payrollRouter } from './Routes/PayrollRouter.js';

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

app.use(cors({
    origin: ["https://hrais-rcramoscc-client.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/auth', adminRouter);
app.use('/employee', employeeRouter);
app.use('/recruitment', recruitmentRouter);
app.use('/payroll', payrollRouter);

app.use(express.static('Public'));

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(401).json({ Status: false, Error: "Invalid token" });
            }
            req.id = decoded.id;
            req.role = decoded.role; // Fix the access to decoded.role
            next();
        });
    } else {
        return res.status(401).json({ Status: false, Error: "Not Authenticated" });
    }
};

app.get('/verify', verifyUser, (req, res) => {
    return res.json({ Status: true, role: req.role, id: req.id });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
