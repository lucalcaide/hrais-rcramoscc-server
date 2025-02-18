import express from 'express';
import pool from '../utils/db.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import csv from 'csv-parser';
import fs from 'fs'; // Use the regular fs module for functions like createReadStream
import { promises as fsPromises } from 'fs'; // Use fs/promises for promise-based file operations
import { parse, format, differenceInMinutes  } from 'date-fns'; // For date conversion
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Define the queries and roles
  const queries = [
    { sql: "SELECT * FROM admin WHERE email = ?", role: 'admin' },
    { sql: "SELECT * FROM recruitment WHERE email = ?", role: 'recruitment' },
    { sql: "SELECT * FROM payroll WHERE email = ?", role: 'payroll' },
    { sql: "SELECT * FROM employee WHERE email = ?", role: 'employee' }
  ];

  try {
    // Iterate through queries to find the user
    for (const query of queries) {
      const [rows] = await pool.query(query.sql, [email]);

      if (rows.length > 0) {
        // Check if the account is deactivated for employees
        if (query.role === 'employee' && rows[0].employee_status === 'Inactive') {
          return res.json({ loginStatus: false, Error: "Account Deactivated!" });
        }

        // Verify the password
        const isMatch = await bcryptjs.compare(password, rows[0].password);
        if (!isMatch) {
          return res.json({ loginStatus: false, Error: "Invalid Email or Password" });
        }

        // Generate a JWT token
        const { email, id } = rows[0];
        const token = jwt.sign(
          { role: query.role, email: email, id: id },
          process.env.JWT_SECRET_KEY || "jwt_secret_key",
          { expiresIn: "1d" }
        );

        // Set the token as an HTTP-only cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Only set the secure flag in production
          sameSite: 'Strict' // Helps prevent CSRF attacks
        });

        return res.json({ loginStatus: true, role: query.role, id });
      }
    }

    // If no user is found in any role
    return res.json({ loginStatus: false, Error: "Check your credentials and try again." });

  } catch (err) {
    console.error('Login error:', err);
    return res.json({ loginStatus: false, Error: "Server error, please try again later." });
  }
});

router.get('/verifyToken', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loginStatus: false, Error: "No token provided" });

  jwt.verify(token, 'jwt_secret_key', (err, decoded) => {
    if (err) return res.json({ loginStatus: false, Error: "Invalid token" });
    
    res.json({
      loginStatus: true,
      role: decoded.role,
      id: decoded.id
    });
  });
});

// Endpoint to update employee status //deactivate employee
router.put('/update_employee_status/:id', async (req, res) => {
  const sqlCheck = "SELECT * FROM employee WHERE id = ?";
  const sqlUpdate = "UPDATE employee SET employee_status = 'Inactive' WHERE id = ?";
  const { id } = req.params;

  try {
    // Check if the employee exists
    const [result] = await pool.query(sqlCheck, [id]);
    if (result.length === 0) {
      return res.json({ Status: false, Error: "Employee not found." });
    }

    // If exists, update the employee status to 'Inactive'
    await pool.query(sqlUpdate, [id]);
    return res.json({ Status: true, Message: "Employee status updated to 'Inactive'." });
  } catch (err) {
    console.error('Error occurred:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Create admin route
router.post('/createadmin', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  try {
    // Check if the email is already used in any role
    const [result] = await pool.query(
      'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
      [email]
    );

    if (result.length > 0) {
      return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert the new admin
    await pool.query(
      'INSERT INTO admin (email, fname, lname, password) VALUES (?, ?, ?, ?)',
      [email, fname, lname, hashedPassword]
    );

    return res.json({ Status: true, Message: 'Admin created successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: 'Query error' });
  }
});

// Create recruitment route
router.post('/createrecruitment', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  try {
    // Check if the email is already used in any role
    const [result] = await pool.query(
      'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
      [email]
    );

    if (result.length > 0) {
      return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert the new recruitment
    await pool.query(
      'INSERT INTO recruitment (email, fname, lname, password) VALUES (?, ?, ?, ?)',
      [email, fname, lname, hashedPassword]
    );

    return res.json({ Status: true, Message: 'Recruitment created successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: 'Query error' });
  }
});

// Create payroll route
router.post('/createpayroll', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  try {
    // Check if the email is already used in any role
    const [result] = await pool.query(
      'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
      [email]
    );

    if (result.length > 0) {
      return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert the new payroll
    await pool.query(
      'INSERT INTO payroll (email, fname, lname, password) VALUES (?, ?, ?, ?)',
      [email, fname, lname, hashedPassword]
    );

    return res.json({ Status: true, Message: 'Payroll created successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: 'Query error' });
  }
});

//get department
router.get("/department", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT * FROM department");
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.post("/add_dept", async (req, res) => {
  const { department } = req.body;
  try {
    const [checkResult] = await pool.query("SELECT * FROM department WHERE name = ?", [department]);
    if (checkResult.length > 0) return res.json({ Status: false, Error: "Department name already exists." });

    await pool.query("INSERT INTO department (name) VALUES (?)", [department]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/update_department/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    // Check if the department name already exists for another department
    const [checkResult] = await pool.query("SELECT * FROM department WHERE name = ? AND id != ?", [name, id]);
    if (checkResult.length > 0) return res.json({ Status: false, Error: "Department name already exists." });

    // If not, update the department name
    await pool.query("UPDATE department SET name = ? WHERE id = ?", [name, id]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.delete("/delete_department/:id", async (req, res) => {
  const departmentId = req.params.id;
  try {
    const [result] = await pool.query("DELETE FROM department WHERE id = ?", [departmentId]);
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Department not found" });
    }
    return res.json({ Status: true, Message: "Department Deleted Successfully" });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

//get project
router.get("/project", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT * FROM project");
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.post("/add_project", async (req, res) => {
  const { project } = req.body;
  try {
    const [checkResult] = await pool.query("SELECT * FROM project WHERE name = ?", [project]);
    if (checkResult.length > 0) return res.json({ Status: false, Error: "Project/Unit already exists." });

    await pool.query("INSERT INTO project (name) VALUES (?)", [project]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/update_project/:id", async (req, res) => {
  const sqlCheck = "SELECT * FROM project WHERE name = ? AND id != ?";
  const sqlUpdate = "UPDATE project SET name = ? WHERE id = ?";
  
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Check if the project name already exists for another project
    const [checkResult] = await pool.query(sqlCheck, [name, id]);
    if (checkResult.length > 0) {
      return res.json({ Status: false, Error: "Project name already exists." });
    }

    // If not, update the project name
    await pool.query(sqlUpdate, [name, id]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.delete("/delete_project/:id", async (req, res) => { 
  const projectId = req.params.id;
  const sql = "DELETE FROM project WHERE id = ?";
  
  try {
    const [result] = await pool.query(sql, [projectId]);
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Project not found" });
    }
    return res.json({ Status: true, Message: "Project Deleted Successfully" }); 
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

//get position
router.get("/position", async (req, res) => {
  const sql = "SELECT * FROM position";
  
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.post("/add_position", async (req, res) => {
  const sqlCheck = "SELECT * FROM position WHERE name = ?";
  const sqlInsert = "INSERT INTO position (name) VALUES (?)";
  
  const { position } = req.body;
  
  try {
    // Check if the position already exists
    const [checkResult] = await pool.query(sqlCheck, [position]);
    if (checkResult.length > 0) {
      return res.json({ Status: false, Error: "Position already exists." });
    }

    // Insert the new position
    await pool.query(sqlInsert, [position]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put("/update_position/:id", async (req, res) => {
  const sqlCheck = "SELECT * FROM position WHERE name = ? AND id != ?";
  const sqlUpdate = "UPDATE position SET name = ? WHERE id = ?";
  
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Check if the position name already exists for another position
    const [checkResult] = await pool.query(sqlCheck, [name, id]);
    if (checkResult.length > 0) {
      return res.json({ Status: false, Error: "Position name already exists." });
    }

    // If not, update the position name
    await pool.query(sqlUpdate, [name, id]);
    return res.json({ Status: true });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.delete("/delete_position/:id", async (req, res) => { 
  const positionId = req.params.id;
  const sql = "DELETE FROM position WHERE id = ?";
  
  try {
    const [result] = await pool.query(sql, [positionId]);
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Position not found" });
    }
    return res.json({ Status: true, Message: "Position Deleted Successfully!" }); 
  } catch (err) {
    console.error('Error:', err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

//upload files

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'Public/Files'; // Default path if no match
    if (file.mimetype.startsWith('image/')) {
      uploadPath = 'Public/Images';
    } else if (file.fieldname === 'resume') {
      uploadPath = 'Public/Resumes';
    } else if (file.fieldname === 'job_offer') {
      uploadPath = 'Public/JobOffers';
    } else if (file.fieldname === 'contract') {
      uploadPath = 'Public/Contracts';
    } else if (file.fieldname === 'valid_id') {
      uploadPath = 'Public/IDs';
    } else if (file.fieldname === 'application_form') {
      uploadPath = 'Public/ApplicationForms';
    } else if (file.fieldname === 'disciplinary_form') {
      uploadPath = 'Public/DisciplinaryForms';
    } else if (file.fieldname === 'attendance_file') {
      uploadPath = 'Public/Attendance';
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, office files, and CSV files are allowed!'));
    }
  }
});

// Adding employee
router.post("/add_employee", upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'job_offer', maxCount: 1 },
  { name: 'contract', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 },
  { name: 'application_form', maxCount: 1 },
  { name: 'disciplinary_form', maxCount: 1 }
]), async (req, res) => {
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ?";
  const sqlInsertEmployee = `
    INSERT INTO employee
    (emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, emergency_name, emergency_relationship, emergency_phone_number, date_hired, pay_frequency, rate_per_day, rate_per_hour, employee_status, department, project, position, email, password, salary, start_time, out_time, image, resume, job_offer, contract, valid_id, application_form, disciplinary_form)
    VALUES (?)
  `;

  try {
    // Check if emp_no is already used
    const [empNoResult] = await pool.query(sqlCheckEmpNo, [req.body.emp_no]);
    if (empNoResult.length > 0) {
      return res.json({ Status: false, Error: "Employee Number is already in use." });
    }

    // Check if email is already used
    const [emailResult] = await pool.query(sqlCheckEmail, [req.body.email]);
    if (emailResult.length > 0) {
      return res.json({ Status: false, Error: "Email is already in use." });
    }

    // Hash the password
    const hash = await bcryptjs.hash(req.body.password, 10);

    // Collect file URLs
    const imageFile = req.files.image ? req.files.image[0].location : null;
    const resumeFile = req.files.resume ? req.files.resume[0].location : null;
    const job_offerFile = req.files.job_offer ? req.files.job_offer[0].location : null;
    const contractFile = req.files.contract ? req.files.contract[0].location : null;
    const valid_idFile = req.files.valid_id ? req.files.valid_id[0].location : null;
    const application_formFile = req.files.application_form ? req.files.application_form[0].location : null;
    const disciplinary_formFile = req.files.disciplinary_form ? req.files.disciplinary_form[0].location : null;

    // Insert employee data
    const values = [
      req.body.emp_no,
      req.body.fname,
      req.body.mname,
      req.body.lname,
      req.body.gender,
      req.body.birth_date,
      req.body.phone_number,
      req.body.perma_address,
      req.body.emergency_name,
      req.body.emergency_relationship,
      req.body.emergency_phone_number,
      req.body.date_hired,
      req.body.pay_frequency,
      req.body.rate_per_day,
      req.body.rate_per_hour,
      req.body.employee_status,
      req.body.department,
      req.body.project,
      req.body.position,
      req.body.email,
      hash,
      req.body.salary,
      req.body.start_time,
      req.body.out_time,
      imageFile,
      resumeFile,
      job_offerFile,
      contractFile,
      valid_idFile,
      application_formFile,
      disciplinary_formFile,
    ];

    await pool.query(sqlInsertEmployee, [values]);
    return res.json({ Status: true, Message: "Employee added successfully" });

  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error adding employee" });
  }
});

// adding employee
router.post('/upload-attendance', upload.single('attendance_file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  if (fileExtension !== '.csv') {
    try {
      await fsPromises.unlink(req.file.path);
      console.log('Non-CSV file deleted successfully');
    } catch (err) {
      console.error('Error deleting file:', err);
    }
    return res.status(400).send({ message: 'Uploaded file is not a CSV file' });
  }

  const filePath = path.join(req.file.destination, req.file.filename);
  const results = [];
  const recordsToCheck = [];
  const empNos = new Set();

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
      try {
        const csvDate = data.date;
        const parsedDate = parse(csvDate, 'dd/MM/yyyy', new Date());
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        const status = data.status && data.status.trim() !== '' ? data.status : 'Pending';

        recordsToCheck.push({ emp_no: data.emp_no, date: formattedDate });
        empNos.add(data.emp_no);

        results.push({
          emp_no: data.emp_no,
          date: formattedDate,
          time_in: data.time_in,
          time_out: data.time_out,
          status: status
        });
      } catch (error) {
        console.error('Error processing date:', error);
        return res.status(500).send({ message: 'File cannot be accepted.' });
      }
    })
    .on('end', async () => {
      try {
        // Check for duplicate records
        const checkSql = 'SELECT emp_no, date FROM attendance WHERE (emp_no, date) IN (?)';
        const values = [recordsToCheck.map(record => [record.emp_no, record.date])];
        const [rows] = await pool.query(checkSql, [values]);

        if (rows.length > 0) {
          await fsPromises.unlink(filePath);
          console.log('File deleted successfully');
          return res.status(400).send({ message: 'Duplicate records found. Upload rejected.' });
        }

        // Fetch start_time, out_time, and rate_per_hour for each employee
        const empNosArray = Array.from(empNos);
        const empQuery = 'SELECT emp_no, start_time, out_time, rate_per_hour FROM employee WHERE emp_no IN (?)';
        const [employees] = await pool.query(empQuery, [empNosArray]);

        // Check for missing employees
        const fetchedEmpNos = new Set(employees.map(emp => emp.emp_no));
        const missingEmpNos = empNosArray.filter(empNo => !fetchedEmpNos.has(empNo));

        if (missingEmpNos.length > 0) {
          await fsPromises.unlink(filePath);
          console.log('File deleted successfully');
          return res.status(400).send({ message: 'Missing Employee detected. Upload Rejected.' });
        }

        const empDetails = new Map();
        employees.forEach(emp => {
          empDetails.set(emp.emp_no, {
            start_time: emp.start_time,
            out_time: emp.out_time,
            rate_per_hour: emp.rate_per_hour,
            rate_per_minute: (emp.rate_per_hour / 60).toFixed(4)
          });
        });

        // Update attendance records
        const updatedResults = results.map(record => {
          const empDetail = empDetails.get(record.emp_no) || {};
          let hoursWorked = 8.00;
          let late = 0;
          let extra = 0;
          let earnings = 0;
          let tardiness = 0;
          let overtime = 0;
          let totalAmountPay = 0;

          if (record.time_in && record.time_out) {
            try {
              const timeIn = parse(record.time_in, 'HH:mm:ss', new Date());
              const timeOut = parse(record.time_out, 'HH:mm:ss', new Date());
              const startTime = parse(empDetail.start_time, 'HH:mm:ss', new Date());
              const outTime = parse(empDetail.out_time, 'HH:mm:ss', new Date());

              let effectiveTimeIn = timeIn;
              if (timeIn < startTime) {
                effectiveTimeIn = startTime;
              }

              let effectiveTimeOut = timeOut;
              if (timeOut > outTime) {
                effectiveTimeOut = outTime;
                extra = differenceInMinutes(timeOut, outTime);
              }

              if (effectiveTimeIn > startTime) {
                late = differenceInMinutes(effectiveTimeIn, startTime);
              }

              earnings = (hoursWorked * empDetail.rate_per_hour).toFixed(2);
              tardiness = (late * empDetail.rate_per_minute).toFixed(2);
              overtime = (extra * empDetail.rate_per_minute).toFixed(2);
              totalAmountPay = (parseFloat(earnings) + parseFloat(overtime) - parseFloat(tardiness)).toFixed(2);
            } catch (parseError) {
              console.error('Error parsing time_in/time_out/start_time/out_time:', parseError);
            }
          }

          return {
            ...record,
            start_time: empDetail.start_time || null,
            out_time: empDetail.out_time || null,
            rate_per_hour: empDetail.rate_per_hour || null,
            rate_per_minute: empDetail.rate_per_minute || null,
            hours_worked: hoursWorked,
            late: late,
            extra: extra,
            earnings: earnings,
            tardiness: tardiness,
            overtime: overtime,
            total_amount_pay: totalAmountPay
          };
        });

        // Insert updated records into the database
        const insertSql = 'INSERT INTO attendance (emp_no, date, time_in, time_out, status, start_time, out_time, rate_per_hour, rate_per_minute, hours_worked, late, extra, earnings, tardiness, overtime, total_amount_pay) VALUES ?';
        const insertValues = updatedResults.map(row => [
          row.emp_no,
          row.date,
          row.time_in,
          row.time_out,
          row.status,
          row.start_time,
          row.out_time,
          row.rate_per_hour,
          row.rate_per_minute,
          row.hours_worked,
          row.late,
          row.extra,
          row.earnings,
          row.tardiness,
          row.overtime,
          row.total_amount_pay
        ]);

        await pool.query(insertSql, [insertValues]);

        res.send({ message: 'Attendance records uploaded successfully' });

        await fsPromises.unlink(filePath);
        console.log('File deleted successfully');
      } catch (error) {
        console.error('Error handling file:', error);
        res.status(500).send({ message: 'Error processing file' });
      }
    });
});

// Endpoint to update an attendance record
router.post('/attendance/update/:id', async (req, res) => {
  const { id } = req.params;
  const { extra, total_amount_pay, hours_worked, status, late } = req.body;

  try {
    // Fetch the existing attendance record
    const [result] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.json({ Status: false, Error: 'No record found' });
    }

    const attendance = result[0];

    // Update fields if provided
    if (extra !== undefined) {
      attendance.extra = extra;
    }
    if (hours_worked !== undefined) {
      attendance.hours_worked = hours_worked;
    }
    if (status !== undefined) {
      attendance.status = status;
    }
    if (late !== undefined) {
      attendance.late = late;
    }

    // Recalculate fields
    const rate_per_minute = attendance.rate_per_hour / 60;
    const overtime = (attendance.extra || 0) * rate_per_minute;
    const earnings = (attendance.hours_worked || 0) * attendance.rate_per_hour;
    const tardiness = Math.max(0, (attendance.late || 0) * rate_per_minute);
    const total_amount_pay = earnings + overtime - tardiness;

    // Update the record in the database
    const sqlUpdate = `
      UPDATE attendance 
      SET extra = ?, hours_worked = ?, total_amount_pay = ?, earnings = ?, overtime = ?, status = ?, late = ?, tardiness = ?
      WHERE id = ?
    `;

    await pool.query(sqlUpdate, [attendance.extra, attendance.hours_worked, total_amount_pay, earnings, overtime, attendance.status, attendance.late, tardiness, id]);

    // Fetch the updated record
    const [updatedResult] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);

    return res.json({ Status: true, Result: updatedResult[0], Message: 'Attendance updated successfully' });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: 'Query Error' });
  }
});


// Endpoint to update only the status of an attendance record
router.post('/attendance/update/status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Fetch the existing attendance record
    const [result] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);

    if (result.length === 0) {
      return res.json({ Status: false, Error: 'No record found' });
    }

    const attendance = result[0];

    // Update status field
    if (status !== undefined) {
      attendance.status = status;
    }

    // Recalculate fields based on the new status if needed
    const rate_per_minute = attendance.rate_per_hour / 60;
    const overtime = (attendance.extra || 0) * rate_per_minute;
    const earnings = (attendance.hours_worked || 0) * attendance.rate_per_hour;
    const tardiness = Math.max(0, (attendance.late || 0) * rate_per_minute);
    const total_amount_pay = earnings + overtime - tardiness;

    // Update the record in the database
    const sqlUpdate = `
      UPDATE attendance 
      SET status = ?, total_amount_pay = ?, earnings = ?, overtime = ?, tardiness = ?
      WHERE id = ?
    `;

    await pool.query(sqlUpdate, [attendance.status, total_amount_pay, earnings, overtime, tardiness, id]);

    // Fetch the updated record
    const [updatedResult] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);

    return res.json({ Status: true, Result: updatedResult[0], Message: 'Attendance status updated successfully' });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: 'Query Error' });
  }
});


// Endpoint to get all attendance records
router.get('/get-attendance-records', async (req, res) => {
  try {
    const sql = 'SELECT * FROM attendance';  // Adjust SQL query as needed
    const [rows] = await pool.query(sql);
    res.send({ Status: true, Result: rows });
  } catch (error) {
    console.error('Error in get-attendance-records endpoint:', error);
    res.status(500).send({ message: 'Failed to fetch attendance records' });
  }
});

// Endpoint to delete an attendance record
router.delete('/delete-attendance-record/:id', async (req, res) => {
  const recordId = req.params.id;
  try {
    const sql = 'DELETE FROM attendance WHERE id = ?';
    const [result] = await pool.query(sql, [recordId]);

    if (result.affectedRows === 0) {
      return res.status(404).send({ Status: false, Error: 'Attendance record not found' });
    }
    res.send({ Status: true, Message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error in delete-attendance-record endpoint:', error);
    res.status(500).send({ Status: false, Error: 'Failed to delete attendance record' });
  }
});

//update image of the employee
router.put('/update_employee_image/:id', upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const newImage = req.file.filename;

  const selectSql = "SELECT image FROM employee WHERE id = ?";
  const updateSql = "UPDATE employee SET image = ? WHERE id = ?";

  try {
    const [rows] = await pool.query(selectSql, [id]);

    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const currentImage = rows[0].image;

    // Update the employee record with the new image filename
    await pool.query(updateSql, [newImage, id]);

    // Delete the old image file from the file system
    if (currentImage) {
      const oldImagePath = `Public/Images/${currentImage}`;
      try {
        await unlink(oldImagePath);
        console.log('Old image deleted successfully');
      } catch (unlinkErr) {
        console.error('Error deleting old image:', unlinkErr);
      }
    }

    return res.json({ Status: true, Message: "Employee image updated successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error updating employee image" });
  }
});

//get employee
router.get("/employee", async (req, res) => {
  const sql = "SELECT * FROM employee";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.get('/employee/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  try {
    const [result] = await pool.query(sql, [id]);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

router.put('/edit_employee/:id', async (req, res) => {
  const id = req.params.id;
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ? AND id != ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ? AND id != ?";
  const sqlUpdateEmployee = `UPDATE employee 
      SET emp_no = ?, fname = ?, mname = ?, lname = ?, gender = ?, birth_date = ?, phone_number = ?, perma_address = ?, emergency_name=?, emergency_relationship=?, emergency_phone_number=?, date_hired = ?, pay_frequency = ?, rate_per_day = ?, rate_per_hour = ?, employee_status = ?, term_date =?, department = ?, project = ?, position = ?, email = ?, salary = ?, start_time = ?, out_time = ?, term_date = ?
      WHERE id = ?`;

  try {
    // Check for existing employee number
    const [empNoResult] = await pool.query(sqlCheckEmpNo, [req.body.emp_no, id]);
    if (empNoResult.length > 0) {
      return res.json({ Status: false, Error: "Employee Number is already in use." });
    }

    // Check for existing email
    const [emailResult] = await pool.query(sqlCheckEmail, [req.body.email, id]);
    if (emailResult.length > 0) {
      return res.json({ Status: false, Error: "Email is already in use." });
    }

    const termDate = req.body.employee_status === 'Inactive' ? new Date() : null;

    const values = [
      req.body.emp_no,
      req.body.fname,
      req.body.mname,
      req.body.lname,
      req.body.gender,
      req.body.birth_date,
      req.body.phone_number,
      req.body.perma_address,
      req.body.emergency_name,
      req.body.emergency_relationship,
      req.body.emergency_phone_number,
      req.body.date_hired,
      req.body.pay_frequency,
      req.body.rate_per_day,
      req.body.rate_per_hour,
      req.body.employee_status,
      req.body.term_date,
      req.body.department,
      req.body.project,
      req.body.position,
      req.body.email,
      req.body.salary,
      req.body.start_time, 
      req.body.out_time, 
      termDate,
      id
    ];

    const [result] = await pool.query(sqlUpdateEmployee, values);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Deactivate employee route
router.put('/deactivate_employee/:id', async (req, res) => {
  const id = req.params.id;
  const sqlDeactivateEmployee = `
    UPDATE employee 
    SET employee_status = ?, term_date = ? 
    WHERE id = ?
  `;

  const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date as 'YYYY-MM-DD HH:MM:SS'
  const values = ['Inactive', currentDate, id];

  try {
    await pool.query(sqlDeactivateEmployee, values);
    return res.json({ Status: true, Message: "Employee deactivated successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deactivating employee" });
  }
});

// Create new password route
router.post('/create_new_password/:id', async (req, res) => {
  const employeeId = req.params.id;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.json({ Status: false, Error: "Both password fields are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.json({ Status: false, Error: "Passwords do not match" });
  }

  try {
    const hash = await bcryptjs.hash(newPassword, 10);
    const sqlUpdatePassword = "UPDATE employee SET password = ? WHERE id = ?";
    const [result] = await pool.query(sqlUpdatePassword, [hash, employeeId]);

    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json({ Status: true, Message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error updating password" });
  }
});

// Delete employee route
router.delete('/delete_employee/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = `
    SELECT image, resume, job_offer, contract, valid_id, application_form, disciplinary_form 
    FROM employee 
    WHERE id = ?
  `;
  const deleteLeaveSql = "DELETE FROM `leave` WHERE emp_id = ?";
  const deleteAttendanceSql = "DELETE FROM attendance WHERE emp_no = ?";
  const deleteEmployeeSql = "DELETE FROM employee WHERE id = ?";

  try {
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { image, resume, job_offer, contract, valid_id, application_form, disciplinary_form } = rows[0];
    const emp_no = rows[0].emp_no;

    // Start a transaction
    await pool.beginTransaction();

    try {
      // Delete associated records
      await pool.query(deleteLeaveSql, [id]);
      await pool.query(deleteAttendanceSql, [emp_no]);
      await pool.query(deleteEmployeeSql, [id]);

      // Commit the transaction
      await pool.commit();

      // Delete associated files
      const filePaths = [
        `Public/Images/${image}`,
        `Public/Resumes/${resume}`,
        `Public/JobOffers/${job_offer}`,
        `Public/Contracts/${contract}`,
        `Public/IDs/${valid_id}`,
        `Public/ApplicationForms/${application_form}`,
        `Public/DisciplinaryForms/${disciplinary_form}`
      ];

      const deletePromises = filePaths.map(async (filePath) => {
        try {
          await unlink(filePath);
          console.log(`File deleted successfully: ${filePath}`);
        } catch (error) {
          console.error(`Error deleting file: ${filePath}`, error);
        }
      });

      await Promise.all(deletePromises);
      return res.json({ Status: true, Message: "Employee, associated records, and files deleted successfully" });

    } catch (err) {
      await pool.rollback();
      console.error(err);
      return res.json({ Status: false, Error: "Error during transaction" });
    }
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting employee and associated records" });
  }
});

// Upload resume route
router.post('/upload_resume/:id', upload.single('resume'), async (req, res) => {
  const id = req.params.id;
  const resume = req.file.filename;
  const updateResumeSql = "UPDATE employee SET resume = ? WHERE id = ?";

  try {
    await pool.query(updateResumeSql, [resume, id]);
    return res.json({ Status: true, Message: "Resume uploaded and updated successfully", resume });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating resume" });
  }
});

// Delete resume route
router.delete('/delete_resume/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT resume FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET resume = NULL WHERE id = ?";

  try {
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { resume } = rows[0];
    const filePath = path.resolve('Public/Resumes', resume);

    // Update the employee record to set resume to NULL
    await pool.query(deleteSql, [id]);

    // Delete the resume file from the file system
    await unlink(filePath);
    console.log(`File deleted successfully: ${filePath}`);
    return res.json({ Status: true, Message: "Resume deleted successfully" });

  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting resume" });
  }
});

// Upload job offer route
router.post('/upload_joboffer/:id', upload.single('job_offer'), async (req, res) => {
  const id = req.params.id;
  const job_offer = req.file.filename;
  const updateJobOfferSql = "UPDATE employee SET job_offer = ? WHERE id = ?";

  try {
    await pool.query(updateJobOfferSql, [job_offer, id]);
    return res.json({ Status: true, Message: "Job Offer uploaded and updated successfully", job_offer });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating job offer" });
  }
});

// Delete job offer route
router.delete('/delete_joboffer/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT job_offer FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET job_offer = NULL WHERE id = ?";

  try {
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { job_offer } = rows[0];
    const filePath = path.resolve('Public/JobOffers', job_offer);

    // Update the employee record to set job_offer to NULL
    await pool.query(deleteSql, [id]);

    // Delete the job offer file from the file system
    await unlink(filePath);
    console.log(`File deleted successfully: ${filePath}`);
    return res.json({ Status: true, Message: "Job Offer deleted successfully" });

  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting job offer" });
  }
});

// Upload contract route
router.post('/upload_contract/:id', upload.single('contract'), async (req, res) => {
  const id = req.params.id;
  const contract = req.file.filename;

  const updateContractSql = "UPDATE employee SET contract = ? WHERE id = ?";

  try {
    await pool.query(updateContractSql, [contract, id]);
    return res.json({ Status: true, Message: "Contract uploaded and updated successfully", contract });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating contract" });
  }
});

// Delete contract route
router.delete('/delete_contract/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT contract FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET contract = NULL WHERE id = ?";

  try {
    // Step 1: Retrieve the contract filename associated with the employee
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { contract } = rows[0];

    // Step 2: Update the employee record to set contract to NULL
    await pool.query(deleteSql, [id]);

    // Step 3: Delete the contract file from the file system
    const filePath = path.resolve(process.cwd(), 'Public/Contracts', contract);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        return res.json({ Status: false, Error: "Error deleting contract file" });
      }

      console.log(`File deleted successfully: ${filePath}`);
      return res.json({ Status: true, Message: "Contract deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting contract" });
  }
});

// Upload valid_id route
router.post('/upload_valid_id/:id', upload.single('valid_id'), async (req, res) => {
  const id = req.params.id;
  const valid_id = req.file.filename;

  const updateIDsSql = "UPDATE employee SET valid_id = ? WHERE id = ?";

  try {
    await pool.query(updateIDsSql, [valid_id, id]);
    return res.json({ Status: true, Message: "Valid IDs uploaded and updated successfully", valid_id });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating valid ids" });
  }
});

// Delete valid_id route
router.delete('/delete_valid_id/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT valid_id FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET valid_id = NULL WHERE id = ?";

  try {
    // Step 1: Retrieve the valid_id filename associated with the employee
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { valid_id } = rows[0];

    // Step 2: Update the employee record to set valid_id to NULL
    await pool.query(deleteSql, [id]);

    // Step 3: Delete the valid_id file from the file system
    const filePath = path.resolve(process.cwd(), 'Public/IDs', valid_id);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        return res.json({ Status: false, Error: "Error deleting valid_id file" });
      }

      console.log(`File deleted successfully: ${filePath}`);
      return res.json({ Status: true, Message: "Valid IDs deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting valid_id" });
  }
});

// Upload application_form route
router.post('/upload_application_form/:id', upload.single('application_form'), async (req, res) => {
  const id = req.params.id;
  const application_form = req.file.filename;

  const updateApplicationFormSql = "UPDATE employee SET application_form = ? WHERE id = ?";

  try {
    await pool.query(updateApplicationFormSql, [application_form, id]);
    return res.json({ Status: true, Message: "Application Form uploaded and updated successfully", application_form });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating application form" });
  }
});

// Delete application_form route
router.delete('/delete_application_form/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT application_form FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET application_form = NULL WHERE id = ?";

  try {
    // Step 1: Retrieve the application_form filename associated with the employee
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { application_form } = rows[0];

    // Step 2: Update the employee record to set application_form to NULL
    await pool.query(deleteSql, [id]);

    // Step 3: Delete the application_form file from the file system
    const filePath = path.resolve(process.cwd(), 'Public/ApplicationForms', application_form);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        return res.json({ Status: false, Error: "Error deleting application form file" });
      }

      console.log(`File deleted successfully: ${filePath}`);
      return res.json({ Status: true, Message: "Application Form deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting application form" });
  }
});

// Upload disciplinary_form route
router.post('/upload_disciplinary_form/:id', upload.single('disciplinary_form'), async (req, res) => {
  const id = req.params.id;
  const disciplinary_form = req.file.filename;

  const updateDisciplinaryFormSql = "UPDATE employee SET disciplinary_form = ? WHERE id = ?";

  try {
    await pool.query(updateDisciplinaryFormSql, [disciplinary_form, id]);
    return res.json({ Status: true, Message: "Disciplinary Form uploaded and updated successfully", disciplinary_form });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error uploading and updating disciplinary form" });
  }
});

// Delete disciplinary_form route
router.delete('/delete_disciplinary_form/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT disciplinary_form FROM employee WHERE id = ?";
  const deleteSql = "UPDATE employee SET disciplinary_form = NULL WHERE id = ?";

  try {
    // Step 1: Retrieve the disciplinary_form filename associated with the employee
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const { disciplinary_form } = rows[0];

    // Step 2: Update the employee record to set disciplinary_form to NULL
    await pool.query(deleteSql, [id]);

    // Step 3: Delete the disciplinary_form file from the file system
    const filePath = path.resolve(process.cwd(), 'Public/DisciplinaryForms', disciplinary_form);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        return res.json({ Status: false, Error: "Error deleting disciplinary_form file" });
      }

      console.log(`File deleted successfully: ${filePath}`);
      return res.json({ Status: true, Message: "Disciplinary Form deleted successfully" });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting disciplinary form" });
  }
});

// Admin count route
router.get('/admin_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS admin FROM admin";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Employee count route
router.get('/employee_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS employee FROM employee";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Employee status counts route
router.get("/employee_status_counts", async (req, res) => {
  const sql = `
    SELECT
      SUM(CASE WHEN employee_status = 'active' THEN 1 ELSE 0 END) AS activeCount,
      SUM(CASE WHEN employee_status = 'inactive' THEN 1 ELSE 0 END) AS inactiveCount
    FROM employee;
  `;
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

//get new hires
router.get('/new_employee_count', async (req, res) => {
  const sql = `
    SELECT COUNT(id) AS newEmployeeCount
    FROM employee
    WHERE date_hired >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
  `;
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].newEmployeeCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Department count route
router.get('/department_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS name FROM department";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Project count route
router.get('/project_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS name FROM project";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Position count route
router.get('/position_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS name FROM position";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0] });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Pending leave count route
router.get('/pending_leave_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS pendingLeaveCount FROM `leave` WHERE status = 'Pending'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].pendingLeaveCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Fulfilled leave count route
router.get('/fulfilled_leave_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS fulfilledLeaveCount FROM `leave` WHERE status = 'Fulfilled'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].fulfilledLeaveCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Rejected leave count route
router.get('/rejected_leave_count', async (req, res) => {
  const sql = "SELECT COUNT(id) AS rejectedLeaveCount FROM `leave` WHERE status = 'Rejected'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].rejectedLeaveCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Admin records route
router.get('/admin_records', async (req, res) => {
  const sql = "SELECT * FROM admin";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Fetch pending attendance count route
router.get('/pending_count', async (req, res) => {
  const sql = "SELECT COUNT(*) AS pendingCount FROM attendance WHERE status = 'Pending'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].pendingCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching pending attendance count: " + err });
  }
});

// Fetch fulfilled attendance count route
router.get('/fulfilled_count', async (req, res) => {
  const sql = "SELECT COUNT(*) AS fulfilledCount FROM attendance WHERE status = 'Fulfilled'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].fulfilledCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching fulfilled attendance count: " + err });
  }
});

// Fetch rejected attendance count route
router.get('/rejected_count', async (req, res) => {
  const sql = "SELECT COUNT(*) AS rejectedCount FROM attendance WHERE status = 'Rejected'";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result[0].rejectedCount });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching rejected attendance count: " + err });
  }
});

// Fetch leave records route
router.get('/leave', async (req, res) => {
  const sql = "SELECT * FROM `leave`";
  try {
    const [result] = await pool.query(sql);
    return res.json({ Status: true, Result: result });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Update leave route
router.put('/update_leave/:id', async (req, res) => {
  const leaveId = req.params.id;
  const { status } = req.body;
  const sql = "UPDATE `leave` SET status = ? WHERE id = ?";

  try {
    const [result] = await pool.query(sql, [status, leaveId]);
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Leave not found" });
    }
    return res.json({ Status: true, Message: "Leave status updated successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error: " + err });
  }
});

// Delete leave route
router.delete('/delete_leave/:id', async (req, res) => {
  const leaveId = req.params.id;
  const selectSql = "SELECT * FROM `leave` WHERE id = ?";
  const deleteSql = "DELETE FROM `leave` WHERE id = ?";

  try {
    // Step 1: Retrieve the leave record from the database
    const [rows] = await pool.query(selectSql, [leaveId]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Leave record not found" });
    }
    
    // Step 2: Delete the leave record from the database
    await pool.query(deleteSql, [leaveId]);

    console.log("Leave record deleted successfully");
    return res.json({ Status: true, Message: "Leave record deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting leave record: " + err });
  }
});

// Logout endpoint
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

export { router as adminRouter }