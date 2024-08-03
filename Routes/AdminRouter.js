import express from 'express';
import con from '../utils/db.js';
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

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Dummy authentication for example; replace with your actual logic
  if (email === 'admin@gmail.com' && password === '12345') {
      const token = jwt.sign(
          { role: 'admin', email, id: 10 }, // Payload with user info
          JWT_SECRET_KEY, 
          { expiresIn: '1h' } // Token expiration
      );

      // Set cookie with token
      res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Set to true for HTTPS in production
          sameSite: 'None' // Or 'Lax' based on your requirements
      });

      // Respond with user details and login status
      res.json({
          loginStatus: true,
          role: 'admin',
          id: 10
      });
  } else {
      res.status(401).json({ loginStatus: false, Error: 'Invalid credentials' });
  }
});

router.get('/verifyToken', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loginStatus: false, Error: "No token provided" });

  jwt.verify(token, 'jwt_secret_key', (err, decoded) => {
    if (err) return res.json({ loginStatus: false, Error: "Failed to authenticate token" });

    res.json({
      loginStatus: true,
      user: decoded
    });
  });
});

// Endpoint to update employee status //deactivate employee
router.put('/update_employee_status/:id', (req, res) => {
  const sqlCheck = "SELECT * FROM employee WHERE id = ?";
  const sqlUpdate = "UPDATE employee SET employee_status = 'Inactive' WHERE id = ?";
  const { id } = req.params;

  // Check if the employee exists
  con.query(sqlCheck, [id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length === 0) return res.json({ Status: false, Error: "Employee not found." });

    // If exists, update the employee status to 'Inactive'
    con.query(sqlUpdate, [id], (updateErr, updateResult) => {
      if (updateErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true, Message: "Employee status updated to 'Inactive'." });
    });
  });
});

// Create admin route
router.post('/createadmin', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  // Check if the email is already used in any role
  con.query(
    'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
    [email],
    async (err, result) => {
      if (err) {
        return res.json({ Status: false, Error: 'Query error' });
      }
      if (result.length > 0) {
        return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const sql = 'INSERT INTO admin (email, fname, lname, password) VALUES (?, ?, ?, ?)';
      con.query(sql, [email, fname, lname, hashedPassword], (err, result) => {
        if (err) {
          return res.json({ Status: false, Error: 'Insert error' });
        }
        return res.json({ Status: true, Message: 'Admin created successfully' });
      });
    }
  );
});

// Create recruitment route
router.post('/createrecruitment', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  // Check if the email is already used in any role
  con.query(
    'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
    [email],
    async (err, result) => {
      if (err) {
        return res.json({ Status: false, Error: 'Query error' });
      }
      if (result.length > 0) {
        return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const sql = 'INSERT INTO recruitment (email, fname, lname, password) VALUES (?, ?, ?, ?)';
      con.query(sql, [email, fname, lname, hashedPassword], (err, result) => {
        if (err) {
          return res.json({ Status: false, Error: 'Insert error' });
        }
        return res.json({ Status: true, Message: 'Recruitment created successfully' });
      });
    }
  );
});

// Create payroll route
router.post('/createpayroll', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  // Check if the email is already used in any role
  con.query(
    'SELECT * FROM (SELECT email FROM admin UNION ALL SELECT email FROM employee UNION ALL SELECT email FROM recruitment UNION ALL SELECT email FROM payroll) AS all_roles WHERE email = ?',
    [email],
    async (err, result) => {
      if (err) {
        return res.json({ Status: false, Error: 'Query error' });
      }
      if (result.length > 0) {
        return res.json({ Status: false, Error: 'This email is already associated with another role. Please use a different email.' });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const sql = 'INSERT INTO payroll (email, fname, lname, password) VALUES (?, ?, ?, ?)';
      con.query(sql, [email, fname, lname, hashedPassword], (err, result) => {
        if (err) {
          return res.json({ Status: false, Error: 'Insert error' });
        }
        return res.json({ Status: true, Message: 'Payroll created successfully' });
      });
    }
  );
});

//get department
router.get("/department", (req, res) => {
  const sql = "SELECT * FROM department";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.post("/add_dept", (req, res) => {
  const sqlCheck = "SELECT * FROM department WHERE name = ?";
  const sqlInsert = "INSERT INTO department (`name`) VALUES (?)";
  
  con.query(sqlCheck, [req.body.department], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Department name already exists." });

    con.query(sqlInsert, [req.body.department], (insertErr, insertResult) => {
      if (insertErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});

router.put("/update_department/:id", (req, res) => {
  const sqlCheck = "SELECT * FROM department WHERE name = ? AND id != ?";
  const sqlUpdate = "UPDATE department SET name = ? WHERE id = ?";
  
  const { id } = req.params;
  const { name } = req.body;

  // Check if the department name already exists for another department
  con.query(sqlCheck, [name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Department name already exists." });

    // If not, update the department name
    con.query(sqlUpdate, [name, id], (updateErr, updateResult) => {
      if (updateErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});


router.delete("/delete_department/:id", (req, res) => { 
  const departmentId = req.params.id;
  const sql = "DELETE FROM department WHERE id = ?";
  con.query(sql, [departmentId], (err, result) => { 
    if (err) return res.json({ Status: false, Error: "Query Error" }); 
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Department not found" });
    }
    return res.json({ Status: true, Message: "Department Deleted Successfully" }); 
  }); 
});

//get project
router.get("/project", (req, res) => {
  const sql = "SELECT * FROM project";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.post("/add_project", (req, res) => {
  const sqlCheck = "SELECT * FROM project WHERE name = ?";
  const sqlInsert = "INSERT INTO project (`name`) VALUES (?)";
  
  con.query(sqlCheck, [req.body.project], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Project/Unit already exists." });

    con.query(sqlInsert, [req.body.project], (insertErr, insertResult) => {
      if (insertErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});

router.put("/update_project/:id", (req, res) => {
  const sqlCheck = "SELECT * FROM project WHERE name = ? AND id != ?";
  const sqlUpdate = "UPDATE project SET name = ? WHERE id = ?";
  
  const { id } = req.params;
  const { name } = req.body;

  // Check if the project name already exists for another project
  con.query(sqlCheck, [name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Project name already exists." });

    // If not, update the project name
    con.query(sqlUpdate, [name, id], (updateErr, updateResult) => {
      if (updateErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});

router.delete("/delete_project/:id", (req, res) => { 
  const projectId = req.params.id;
  const sql = "DELETE FROM project WHERE id = ?";
  con.query(sql, [projectId], (err, result) => { 
    if (err) return res.json({ Status: false, Error: "Query Error" }); 
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Project not found" });
    }
    return res.json({ Status: true, Message: "Project Deleted Successfully" }); 
  }); 
});

//get position
router.get("/position", (req, res) => {
  const sql = "SELECT * FROM position";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.post("/add_position", (req, res) => {
  const sqlCheck = "SELECT * FROM position WHERE name = ?";
  const sqlInsert = "INSERT INTO `position` (`name`) VALUES (?)";
  
  con.query(sqlCheck, [req.body.position], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Position already exists." });

    con.query(sqlInsert, [req.body.position], (insertErr, insertResult) => {
      if (insertErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});

router.put("/update_position/:id", (req, res) => {
  const sqlCheck = "SELECT * FROM position WHERE name = ? AND id != ?";
  const sqlUpdate = "UPDATE position SET name = ? WHERE id = ?";
  
  const { id } = req.params;
  const { name } = req.body;

  // Check if the position name already exists for another position
  con.query(sqlCheck, [name, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (result.length > 0) return res.json({ Status: false, Error: "Position name already exists." });

    // If not, update the position name
    con.query(sqlUpdate, [name, id], (updateErr, updateResult) => {
      if (updateErr) return res.json({ Status: false, Error: "Query Error" });
      return res.json({ Status: true });
    });
  });
});

router.delete("/delete_position/:id", (req, res) => { 
  const positionId = req.params.id;
  const sql = "DELETE FROM position WHERE id = ?";
  con.query(sql, [positionId], (err, result) => { 
    if (err) return res.json({ Status: false, Error: "Query Error" }); 
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Position not found" });
    }
    return res.json({ Status: true, Message: "Position Deleted Successfully!" }); 
  }); 
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

router.post('/upload-attendance', upload.single('attendance_file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  // Check if the uploaded file is a CSV
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  if (fileExtension !== '.csv') {
    fsPromises.unlink(req.file.path)
      .then(() => console.log('Non-CSV file deleted successfully'))
      .catch(err => console.error('Error deleting file:', err));
    return res.status(400).send({ message: 'Uploaded file is not a CSV file' });
  }

  const filePath = path.join(req.file.destination, req.file.filename);
  const results = [];
  const recordsToCheck = [];
  const empNos = new Set();  // To hold unique employee numbers

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
      try {
        const csvDate = data.date;
        const parsedDate = parse(csvDate, 'dd/MM/yyyy', new Date());
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        const status = data.status && data.status.trim() !== '' ? data.status : 'Pending';

        recordsToCheck.push({ emp_no: data.emp_no, date: formattedDate });
        empNos.add(data.emp_no);  // Collect unique employee numbers

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
        // Step 1: Check for duplicate records
        const checkSql = 'SELECT emp_no, date FROM attendance WHERE (emp_no, date) IN ?';
        const values = [recordsToCheck.map(record => [record.emp_no, record.date])];

        con.query(checkSql, [values], (err, rows) => {
          if (err) {
            console.error('Error checking records:', err);
            return res.status(500).send({ message: 'Error checking records for duplicates' });
          }

          if (rows.length > 0) {
            res.status(400).send({ message: 'Duplicate records found. Upload rejected.' });

            fsPromises.unlink(filePath)
              .then(() => console.log('File deleted successfully'))
              .catch(err => console.error('Error deleting file:', err));

            return;
          }

          // Step 2: Fetch start_time, out_time, and rate_per_hour for each employee
          const empNosArray = Array.from(empNos);
          const empQuery = 'SELECT emp_no, start_time, out_time, rate_per_hour FROM employee WHERE emp_no IN ?';
          con.query(empQuery, [[empNosArray]], (err, employees) => {
            if (err) {
              console.error('Error fetching employee details:', err);
              return res.status(500).send({ message: 'Error fetching employee details' });
            }

            // Check for missing employees
            const fetchedEmpNos = new Set(employees.map(emp => emp.emp_no));
            const missingEmpNos = empNosArray.filter(empNo => !fetchedEmpNos.has(empNo));

            if (missingEmpNos.length > 0) {
              res.status(400).send({ message: 'Missing Employee detected. Upload Rejected.' });

              fsPromises.unlink(filePath)
                .then(() => console.log('File deleted successfully'))
                .catch(err => console.error('Error deleting file:', err));

              return;
            }

            const empDetails = new Map();
            employees.forEach(emp => {
              empDetails.set(emp.emp_no, {
                start_time: emp.start_time,
                out_time: emp.out_time,
                rate_per_hour: emp.rate_per_hour,
                rate_per_minute: (emp.rate_per_hour / 60).toFixed(4)  // Calculate rate_per_minute with 4 decimal precision
              });
            });

            // Step 3: Update attendance records with employee details and calculate earnings, late, extra, tardiness, overtime, and total_amount_pay
            const updatedResults = results.map(record => {
              const empDetail = empDetails.get(record.emp_no) || {};
              let hoursWorked = 8.00;  // Default hours_worked to 8.00
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

                  // Calculate late
                  if (effectiveTimeIn > startTime) {
                    late = differenceInMinutes(effectiveTimeIn, startTime);
                  }

                  // Calculate earnings
                  earnings = (hoursWorked * empDetail.rate_per_hour).toFixed(2);

                  // Calculate tardiness
                  tardiness = (late * empDetail.rate_per_minute).toFixed(2);

                  // Calculate overtime
                  overtime = (extra * empDetail.rate_per_minute).toFixed(2);

                  // Calculate total_amount_pay
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

            // Step 4: Insert updated records into the database
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

            con.query(insertSql, [insertValues], (err) => {
              if (err) {
                console.error('Error inserting attendance records:', err);
                return res.status(500).send({ message: 'Failed to insert records' });
              }

              res.send({ message: 'Attendance records uploaded successfully' });

              fsPromises.unlink(filePath)
                .then(() => console.log('File deleted successfully'))
                .catch(err => console.error('Error deleting file:', err));
            });
          });
        });
      } catch (error) {
        console.error('Error handling file:', error);
        res.status(500).send({ message: 'Error processing file' });
      }
    });
});

// Endpoint to update an attendance record
router.post('/attendance/update/:id', (req, res) => {
  const { id } = req.params;
  const { extra, total_amount_pay, hours_worked, status, late } = req.body;

  // Fetch the existing attendance record
  con.query('SELECT * FROM attendance WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: 'Query Error' });
    }

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

    con.query(sqlUpdate, [attendance.extra, attendance.hours_worked, total_amount_pay, earnings, overtime, attendance.status, attendance.late, tardiness, id], (err, updateResult) => {
      if (err) {
        console.error(err);
        return res.json({ Status: false, Error: 'Query Error' });
      }

      // Fetch the updated record
      con.query('SELECT * FROM attendance WHERE id = ?', [id], (err, updatedResult) => {
        if (err) {
          console.error(err);
          return res.json({ Status: false, Error: 'Query Error' });
        }

        return res.json({ Status: true, Result: updatedResult[0], Message: 'Attendance updated successfully' });
      });
    });
  });
});

// Endpoint to update only the status of an attendance record
router.post('/attendance/update/status/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Fetch the existing attendance record
  con.query('SELECT * FROM attendance WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: 'Query Error' });
    }

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

    con.query(sqlUpdate, [attendance.status, total_amount_pay, earnings, overtime, tardiness, id], (err, updateResult) => {
      if (err) {
        console.error(err);
        return res.json({ Status: false, Error: 'Query Error' });
      }

      // Fetch the updated record
      con.query('SELECT * FROM attendance WHERE id = ?', [id], (err, updatedResult) => {
        if (err) {
          console.error(err);
          return res.json({ Status: false, Error: 'Query Error' });
        }

        return res.json({ Status: true, Result: updatedResult[0], Message: 'Attendance status updated successfully' });
      });
    });
  });
});

// Endpoint to get all attendance records
router.get('/get-attendance-records', async (req, res) => {
  try {
    const sql = 'SELECT * FROM attendance';  // Adjust SQL query as needed
    con.query(sql, (err, rows) => {
      if (err) {
        console.error('Error fetching attendance records:', err);
        return res.status(500).send({ message: 'Error fetching attendance records' });
      }
      res.send({ Status: true, Result: rows });
    });
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
    con.query(sql, [recordId], (err, result) => {
      if (err) {
        console.error('Error deleting attendance record:', err);
        return res.status(500).send({ Status: false, Error: 'Error deleting attendance record' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).send({ Status: false, Error: 'Attendance record not found' });
      }
      res.send({ Status: true, Message: 'Attendance record deleted successfully' });
    });
  } catch (error) {
    console.error('Error in delete-attendance-record endpoint:', error);
    res.status(500).send({ Status: false, Error: 'Failed to delete attendance record' });
  }
});

//adding employee
router.post("/add_employee", upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'job_offer', maxCount: 1 },
  { name: 'contract', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 },
  { name: 'application_form', maxCount: 1 },
  { name: 'disciplinary_form', maxCount: 1 }
]), (req, res) => {
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ?";
  const sqlInsertEmployee = `
    INSERT INTO employee
    (emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, emergency_name, emergency_relationship, emergency_phone_number, date_hired, pay_frequency, rate_per_day, rate_per_hour, employee_status, department, project, position, email, password, salary, start_time, out_time, image, resume, job_offer, contract, valid_id, application_form, disciplinary_form)
    VALUES (?)
  `;

  // Check if emp_no is already used
  con.query(sqlCheckEmpNo, [req.body.emp_no], (err, empNoResult) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    if (empNoResult.length > 0) {
      return res.json({ Status: false, Error: "Employee Number is already in use." });
    } else {
      // Check if email is already used
      con.query(sqlCheckEmail, [req.body.email], (err, emailResult) => {
        if (err) return res.json({ Status: false, Error: "Query Error" });
        if (emailResult.length > 0) {
          return res.json({ Status: false, Error: "Email is already in use." });
        } else {
          // If both emp_no and email are unique, proceed with insertion
          bcryptjs.hash(req.body.password, 10, (hashErr, hash) => {
            if (hashErr) return res.json({ Status: false, Error: "Error Hashing Password" });

            const imageFile = req.files.image ? req.files.image[0].filename : null;
            const resumeFile = req.files.resume ? req.files.resume[0].filename : null;
            const job_offerFile = req.files.job_offer ? req.files.job_offer[0].filename : null;
            const contractFile = req.files.contract ? req.files.contract[0].filename : null;
            const valid_idFile = req.files.valid_id ? req.files.valid_id[0].filename : null;
            const application_formFile = req.files.application_form ? req.files.application_form[0].filename : null;
            const disciplinary_formFile = req.files.disciplinary_form ? req.files.disciplinary_form[0].filename : null;

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
              req.body.start_time, // Replace req.body.start_time with startTime12Hour
              req.body.out_time, // Replace req.body.out_time with outTime12Hour
              imageFile,
              resumeFile,
              job_offerFile,
              contractFile,
              valid_idFile,
              application_formFile,
              disciplinary_formFile,
            ];

            con.query(sqlInsertEmployee, [values], (insertErr, result) => {
              if (insertErr) return res.json({ Status: false, Error: "Query Error" });
              return res.json({ Status: true });
            });
          });
        }
      });
    }
  });
});

//update image of the employee
router.put('/update_employee_image/:id', upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const newImage = req.file.filename;

  const selectSql = "SELECT image FROM employee WHERE id = ?";
  const updateSql = "UPDATE employee SET image = ? WHERE id = ?";

  try {
    // Step 1: Retrieve the current image filename associated with the employee
    con.query(selectSql, [id], async (err, rows) => {
      if (err) throw err;
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const currentImage = rows[0].image;

      // Step 2: Update the employee record with the new image filename
      con.query(updateSql, [newImage, id], async (err) => {
        if (err) throw err;

        // Step 3: Delete the old image file from the file system
        if (currentImage) {
          const oldImagePath = `Public/Images/${currentImage}`;
          await unlink(oldImagePath);
        }

        return res.json({ Status: true, Message: "Employee image updated successfully" });
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error updating employee image" });
  }
});

//get employee
router.get("/employee", (req, res) => {
  const sql = "SELECT * FROM employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

//get new hires
router.get('/new_employee_count', (req, res) => {
  const sql = `
    SELECT COUNT(id) AS newEmployeeCount
    FROM employee
    WHERE date_hired >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
  `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].newEmployeeCount });
  });
});

router.get('/employee/:id', (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql,[id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
})

router.put('/edit_employee/:id', (req, res) => {
  const id = req.params.id;
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ? AND id != ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ? AND id != ?";
  const sqlUpdateEmployee = `UPDATE employee 
      SET emp_no = ?, fname = ?, mname = ?, lname = ?, gender = ?, birth_date = ?, phone_number = ?, perma_address = ?, emergency_name=?, emergency_relationship=?, emergency_phone_number=?, date_hired = ?, pay_frequency = ?, rate_per_day = ?, rate_per_hour = ?, employee_status = ?, term_date =?, department = ?, project = ?, position = ?, email = ?, salary = ?, start_time = ?, out_time = ?, term_date = ?
      WHERE id = ?`;

  con.query(sqlCheckEmpNo, [req.body.emp_no, id], (err, empNoResult) => {
    if (err) return res.json({ Status: false, Error: "Query Error" + err });
    if (empNoResult.length > 0) {
        return res.json({ Status: false, Error: "Employee Number is already in use." });
    } else {
        con.query(sqlCheckEmail, [req.body.email, id], (err, emailResult) => {
            if (err) return res.json({ Status: false, Error: "Query Error" + err });
            if (emailResult.length > 0) {
                return res.json({ Status: false, Error: "Email is already in use." });
            } else {
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
                  termDate,  // Update the term_date based on employee_status
                  id
              ];

              con.query(sqlUpdateEmployee, values, (err, result) => {
                  if (err) return res.json({ Status: false, Error: "Query Error" + err });
                  return res.json({ Status: true, Result: result });
              });
          }
      });
  }
  });
});

// Deactivate employee route
router.put('/deactivate_employee/:id', (req, res) => {
  const id = req.params.id;
  const sqlDeactivateEmployee = `
    UPDATE employee 
    SET employee_status = ?, term_date = ? 
    WHERE id = ?
  `;

  const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format date as 'YYYY-MM-DD HH:MM:SS'

  const values = ['Inactive', currentDate, id];

  con.query(sqlDeactivateEmployee, values, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error: " + err });
    return res.json({ Status: true, Result: result });
  });
});

router.post('/create_new_password/:id', (req, res) => {
  const employeeId = req.params.id;
  const { newPassword, confirmPassword } = req.body;

  // Validate input
  if (!newPassword || !confirmPassword) {
    return res.json({ Status: false, Error: "Both password fields are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.json({ Status: false, Error: "Passwords do not match" });
  }

  // Hash the new password
  bcryptjs.hash(newPassword, 10, (hashErr, hash) => {
    if (hashErr) return res.json({ Status: false, Error: "Error hashing password" });

    // Update the password in the database
    const sqlUpdatePassword = "UPDATE employee SET password = ? WHERE id = ?";
    con.query(sqlUpdatePassword, [hash, employeeId], (err, result) => {
      if (err) return res.json({ Status: false, Error: "Query Error" });
      if (result.affectedRows === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }
      return res.json({ Status: true, Message: "Password updated successfully" });
    });
  });
});

import { unlink } from 'fs/promises'; // Using fs promises API for unlink

// Delete employee route
router.delete('/delete_employee/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = `
    SELECT image, resume, job_offer, contract, valid_id, application_form, disciplinary_form, emp_no 
    FROM employee 
    WHERE id = ?
  `;
  const deleteLeaveSql = "DELETE FROM `leave` WHERE emp_id = ?";
  const deleteAttendanceSql = "DELETE FROM attendance WHERE emp_no = ?";
  const deleteEmployeeSql = "DELETE FROM employee WHERE id = ?";
  
  try {
    // Step 1: Retrieve the image filename and emp_no associated with the employee
    con.query(selectSql, [id], async (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ Status: false, Error: "Error retrieving employee records" });
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }
      
      const {
        image,
        resume,
        job_offer,
        contract,
        valid_id,
        application_form,
        disciplinary_form,
        emp_no
      } = rows[0];
      
      // Start a transaction
      con.beginTransaction(async (err) => {
        if (err) {
          console.error(err);
          return res.json({ Status: false, Error: "Error starting transaction" });
        }

        try {
          // Step 2: Delete the associated leave records
          con.query(deleteLeaveSql, [id], (err) => {
            if (err) {
              return con.rollback(() => {
                console.error(err);
                res.json({ Status: false, Error: "Error deleting leave records" });
              });
            }

            // Step 3: Delete the associated attendance records
            con.query(deleteAttendanceSql, [emp_no], (err) => {
              if (err) {
                return con.rollback(() => {
                  console.error(err);
                  res.json({ Status: false, Error: "Error deleting attendance records" });
                });
              }

              // Step 4: Delete the employee record from the database
              con.query(deleteEmployeeSql, [id], async (err) => {
                if (err) {
                  return con.rollback(() => {
                    console.error(err);
                    res.json({ Status: false, Error: "Error deleting employee record" });
                  });
                }
                
                // Step 5: Commit the transaction
                con.commit(async (err) => {
                  if (err) {
                    return con.rollback(() => {
                      console.error(err);
                      res.json({ Status: false, Error: "Error committing transaction" });
                    });
                  }
                  
                  // Step 6: Delete the associated files from the file system
                  const filePaths = [
                    `Public/Images/${image}`,
                    `Public/Resumes/${resume}`,
                    `Public/JobOffers/${job_offer}`,
                    `Public/Contracts/${contract}`,
                    `Public/IDs/${valid_id}`,
                    `Public/ApplicationForms/${application_form}`,
                    `Public/DisciplinaryForms/${disciplinary_form}`
                  ];

                  const deletePromises = filePaths.map(async (path) => {
                    try {
                      await unlink(path);
                      console.log(`File deleted successfully: ${path}`);
                    } catch (error) {
                      console.error(`Error deleting file: ${path}`, error);
                    }
                  });

                  await Promise.all(deletePromises);
                  
                  return res.json({ Status: true, Message: "Employee, associated attendance, and files deleted successfully" });
                });
              });
            });
          });
        } catch (err) {
          console.error(err);
          con.rollback(() => {
            return res.json({ Status: false, Error: "Error during transaction" });
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting employee and associated files" });
  }
});

//upload resume route
router.post('/upload_resume/:id', upload.single('resume'), async (req, res) => {
  const id = req.params.id;
  const resume = req.file.filename;

  const updateResumeSql = "UPDATE employee SET resume = ? WHERE id = ?";

  try {
    con.query(updateResumeSql, [resume, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Resume uploaded and updated successfully", resume });
    });
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
    // Step 1: Retrieve the resume filename associated with the employee
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { resume } = rows[0];

      // Step 2: Update the employee record to set resume to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

        // Step 3: Delete the resume file from the file system
        const filePath = path.resolve(process.cwd(), 'Public/Resumes', resume);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file: ${filePath}`, err);
            return res.json({ Status: false, Error: "Error deleting resume file" });
          }

          console.log(`File deleted successfully: ${filePath}`);
          return res.json({ Status: true, Message: "Resume deleted successfully" });
        });
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting resume" });
  }
});

//upload job offer route
router.post('/upload_joboffer/:id', upload.single('job_offer'), async (req, res) => {
  const id = req.params.id;
  const job_offer = req.file.filename;

  const updateJobOfferSql = "UPDATE employee SET job_offer = ? WHERE id = ?";

  try {
    con.query(updateJobOfferSql, [job_offer, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Job Offer uploaded and updated successfully", job_offer });
    });
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
    // Step 1: Retrieve the job_offer filename associated with the employee
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { job_offer } = rows[0];

      // Step 2: Update the employee record to set job_offer to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

        // Step 3: Delete the job_offer file from the file system
        const filePath = path.resolve(process.cwd(), 'Public/JobOffers', job_offer);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file: ${filePath}`, err);
            return res.json({ Status: false, Error: "Error deleting job offer file" });
          }

          console.log(`File deleted successfully: ${filePath}`);
          return res.json({ Status: true, Message: "Job Offer deleted successfully" });
        });
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting Job Offer" });
  }
});

//upload contract route
router.post('/upload_contract/:id', upload.single('contract'), async (req, res) => {
  const id = req.params.id;
  const contract = req.file.filename;

  const updateContractSql = "UPDATE employee SET contract = ? WHERE id = ?";

  try {
    con.query(updateContractSql, [contract, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Contract uploaded and updated successfully", contract });
    });
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
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { contract } = rows[0];

      // Step 2: Update the employee record to set contract to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

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
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting contract" });
  }
});

//upload valid_id route
router.post('/upload_valid_id/:id', upload.single('valid_id'), async (req, res) => {
  const id = req.params.id;
  const valid_id = req.file.filename;

  const updateIDsSql = "UPDATE employee SET valid_id = ? WHERE id = ?";

  try {
    con.query(updateIDsSql, [valid_id, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Valid IDs uploaded and updated successfully", valid_id });
    });
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
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { valid_id } = rows[0];

      // Step 2: Update the employee record to set valid_id to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

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
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting valid_id" });
  }
});

//upload application_form route
router.post('/upload_application_form/:id', upload.single('application_form'), async (req, res) => {
  const id = req.params.id;
  const application_form = req.file.filename;

  const updateApplicationFormSql = "UPDATE employee SET application_form = ? WHERE id = ?";

  try {
    con.query(updateApplicationFormSql, [application_form, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Application Form uploaded and updated successfully", application_form });
    });
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
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { application_form } = rows[0];

      // Step 2: Update the employee record to set application_form to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

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
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting application form" });
  }
});

//upload disciplinary_form route
router.post('/upload_disciplinary_form/:id', upload.single('disciplinary_form'), async (req, res) => {
  const id = req.params.id;
  const disciplinary_form = req.file.filename;

  const updateDisciplinaryFormSql = "UPDATE employee SET disciplinary_form = ? WHERE id = ?";

  try {
    con.query(updateDisciplinaryFormSql, [disciplinary_form, id], (err, result) => {
      if (err) {
        throw err;
      }
      return res.json({ Status: true, Message: "Disciplinary Form uploaded and updated successfully", disciplinary_form });
    });
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
    con.query(selectSql, [id], (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }

      const { disciplinary_form } = rows[0];

      // Step 2: Update the employee record to set disciplinary_form to NULL
      con.query(deleteSql, [id], (err) => {
        if (err) {
          throw err;
        }

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
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting disciplinary form" });
  }
});

router.get('/admin_count', (req, res) => {
  const sql = "select count(id) as admin from admin";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

router.get('/employee_count', (req, res) => {
  const sql = "select count(id) as employee from employee";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

router.get('/department_count', (req, res) => {
  const sql = "select count(id) as department from department";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

router.get('/project_count', (req, res) => {
  const sql = "select count(id) as project from project";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

router.get('/position_count', (req, res) => {
  const sql = "select count(id) as position from position";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

// In your Express backend file (e.g., routes.js)

router.get("/employee_status_counts", (req, res) => {
  const sql = `
    SELECT
      SUM(CASE WHEN employee_status = 'active' THEN 1 ELSE 0 END) AS activeCount,
      SUM(CASE WHEN employee_status = 'inactive' THEN 1 ELSE 0 END) AS inactiveCount
    FROM employee;
  `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0] });
  });
});


router.get('/admin_records', (req, res) => {
  const sql = "select * from admin"
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error"+err });
    return res.json({ Status: true, Result: result });
  });
})

router.get('/pending_leave_count', (req, res) => {
  const sql = "SELECT COUNT(id) AS pendingLeaveCount FROM `leave` WHERE status = 'Pending'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// In your express router file
router.get('/fulfilled_leave_count', (req, res) => {
  const sql = "SELECT COUNT(id) AS fulfilledLeaveCount FROM `leave` WHERE status = 'Fulfilled'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// In your express router file
router.get('/rejected_leave_count', (req, res) => {
  const sql = "SELECT COUNT(id) AS rejectedLeaveCount FROM `leave` WHERE status = 'Rejected'";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.get('/leave', (req, res) => {
  const sql = "SELECT * FROM `leave`";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

router.put('/update_leave/:id', (req, res) => {
  const leaveId = req.params.id;
  const { status } = req.body;

  // Update the leave status in the database
  const sql = "UPDATE `leave` SET status = ? WHERE id = ?";
  con.query(sql, [status, leaveId], (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: "Query Error" });
    }
    if (result.affectedRows === 0) {
      return res.json({ Status: false, Error: "Leave not found" });
    }
    return res.json({ Status: true, Message: "Leave status updated successfully" });
  });
});

router.delete('/delete_leave/:id', async (req, res) => {
  const leaveId = req.params.id;
  const selectSql = "SELECT * FROM `leave` WHERE id = ?";
  const deleteSql = "DELETE FROM `leave` WHERE id = ?";

  try {
    // Step 1: Retrieve the leave record from the database
    con.query(selectSql, [leaveId], async (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Leave record not found" });
      }
      
      // Step 2: Delete the leave record from the database
      con.query(deleteSql, [leaveId], async (err) => {
        if (err) {
          throw err;
        }
        // Leave record deleted successfully
        console.log("Leave record deleted successfully");
        return res.json({ Status: true, Message: "Leave record deleted successfully" });
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting leave record" });
  }
});

// Fetch fulfilled attendance count
router.get('/fulfilled_count', (req, res) => {
  const sql = "SELECT COUNT(*) AS fulfilledCount FROM attendance WHERE status = 'Fulfilled'";
  con.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching fulfilled attendance count" });
    }
    return res.json({ Status: true, Result: result[0].fulfilledCount });
  });
});

// Fetch rejected attendance count
router.get('/rejected_count', (req, res) => {
  const sql = "SELECT COUNT(*) AS rejectedCount FROM attendance WHERE status = 'Rejected'";
  con.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching rejected attendance count" });
    }
    return res.json({ Status: true, Result: result[0].rejectedCount });
  });
});

// Fetch pending attendance count
router.get('/pending_count', (req, res) => {
  const sql = "SELECT COUNT(*) AS pendingCount FROM attendance WHERE status = 'Pending'";
  con.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching pending attendance count" });
    }
    return res.json({ Status: true, Result: result[0].pendingCount });
  });
});

// Logout endpoint
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

export { router as adminRouter }