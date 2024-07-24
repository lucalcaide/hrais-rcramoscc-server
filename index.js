import express from "express"
import cors from 'cors'
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import { adminRouter } from "./Routes/AdminRouter.js"
import { employeeRouter } from "./Routes/EmployeeRouter.js"
import { recruitmentRouter } from "./Routes/RecruitmentRouter.js"
import { payrollRouter } from "./Routes/PayrollRouter.js"

const app = express()
app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use('/auth', adminRouter)
app.use('/employee', employeeRouter)
app.use('/recruitment', recruitmentRouter)
app.use('/payroll', payrollRouter)

app.use(express.static('Public'))

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, 'jwt_secret_key', (err, decoded) => {
            if (err) {
                return res.json({ Status: false, Error: "Wrong token" });
            }
            req.id = decoded.id;
            req.role = decoded.role;  // Fix the access to decoded.role
            next();
        });
    } else {
        return res.json({ Status: false, Error: "Not Authenticated" });
    }
};

app.get('/verify', verifyUser, (req, res) => {
    return res.json({ Status: true, role: req.role, id: req.id });
});

app.listen(3000, () => {
    console.log("Server is running")
})