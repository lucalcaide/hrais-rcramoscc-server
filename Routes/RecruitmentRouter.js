import express from "express";
import pool from "../utils/db.js";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";

const router = express.Router();

// Logout endpoint
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

// Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Public/Images');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// Add employee route
router.post("/add_employee", upload.single('image'), async (req, res) => {
  const { emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, pay_frequency, rate_per_hour, rate_per_day, employee_status, department, project, position, email, password, salary, start_time, out_time } = req.body;

  if (!emp_no || !email || !password) {
    return res.json({ Status: false, Error: 'Employee number, email, and password are required' });
  }

  try {
    // Check if emp_no or email is already used
    const [empNoResult] = await pool.query("SELECT id FROM employee WHERE emp_no = ?", [emp_no]);
    if (empNoResult.length > 0) {
      return res.json({ Status: false, Error: "Employee Number is already in use." });
    }

    const [emailResult] = await pool.query("SELECT id FROM employee WHERE email = ?", [email]);
    if (emailResult.length > 0) {
      return res.json({ Status: false, Error: "Email is already in use." });
    }

    // Hash password and insert employee
    const hashedPassword = await bcryptjs.hash(password, 10);
    const values = [
      emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, pay_frequency,
      rate_per_hour, rate_per_day, employee_status, department, project, position, email, hashedPassword,
      salary, start_time, out_time, req.file?.filename
    ];

    await pool.query(`
      INSERT INTO employee (emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, 
      pay_frequency, rate_per_hour, rate_per_day, employee_status, department, project, position, email, password, 
      salary, start_time, out_time, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, values);

    return res.json({ Status: true });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error processing request" });
  }
});

// Delete employee route
router.delete('/delete_employee/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT image FROM employee WHERE id = ?";
  const deleteSql = "DELETE FROM employee WHERE id = ?";

  try {
    // Retrieve the image filename
    const [rows] = await pool.query(selectSql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }

    const imageFilename = rows[0].image;

    // Delete the employee record
    await pool.query(deleteSql, [id]);

    // Delete the associated image file
    if (imageFilename) {
      const imagePath = `Public/Images/${imageFilename}`;
      await unlink(imagePath);
      console.log("Image file deleted successfully");
    }

    return res.json({ Status: true, Message: "Employee and associated image deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting employee and associated image" });
  }
});

// Edit employee route
router.put('/edit_employee/:id', async (req, res) => {
  const id = req.params.id;
  const { emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, pay_frequency, 
    rate_per_hour, rate_per_day, employee_status, department, project, position, email, salary, start_time, out_time } = req.body;

  try {
    // Check if emp_no or email is already used
    const [empNoResult] = await pool.query("SELECT id FROM employee WHERE emp_no = ? AND id != ?", [emp_no, id]);
    if (empNoResult.length > 0) {
      return res.json({ Status: false, Error: "Employee Number is already in use." });
    }

    const [emailResult] = await pool.query("SELECT id FROM employee WHERE email = ? AND id != ?", [email, id]);
    if (emailResult.length > 0) {
      return res.json({ Status: false, Error: "Email is already in use." });
    }

    // Update employee details
    const values = [
      emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, pay_frequency, 
      rate_per_hour, rate_per_day, employee_status, department, project, position, email, salary, start_time, out_time, id
    ];

    await pool.query(`
      UPDATE employee
      SET emp_no = ?, fname = ?, mname = ?, lname = ?, gender = ?, birth_date = ?, phone_number = ?, 
      perma_address = ?, date_hired = ?, pay_frequency = ?, rate_per_hour = ?, rate_per_day = ?, 
      employee_status = ?, department = ?, project = ?, position = ?, email = ?, salary = ?, start_time = ?, out_time = ?
      WHERE id = ?
    `, values);

    return res.json({ Status: true });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error processing request" });
  }
});


export {router as recruitmentRouter}