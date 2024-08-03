import express from "express";
import pool from "../utils/db.js";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Employee login endpoint
router.post("/employeelogin", async (req, res) => {
  const sql = "SELECT * FROM employee WHERE email = ?";
  try {
    const [rows] = await pool.query(sql, [req.body.email]);
    if (rows.length === 0) {
      return res.json({ loginStatus: false, Error: "Invalid credentials" });
    }

    const employee = rows[0];
    if (employee.employee_status !== 'active') {
      return res.json({ loginStatus: false, Error: "Employee is currently inactive" });
    }

    const match = await bcryptjs.compare(req.body.password, employee.password);
    if (match) {
      const token = jwt.sign(
        { role: "employee", email: employee.email, id: employee.id },
        "employee_secret_key",
        { expiresIn: "1d" }
      );
      res.cookie("token", token);
      return res.json({ loginStatus: true, id: employee.id });
    } else {
      return res.json({ loginStatus: false, Error: "Wrong Password" });
    }
  } catch (err) {
    console.error(err);
    return res.json({ loginStatus: false, Error: "Query error" });
  }
});

// Get employee details
router.get('/detail/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  try {
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query error" });
  }
});

// Fetch attendance records
router.get('/attendance/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM attendance WHERE emp_no = ?";
  try {
    const [rows] = await pool.query(sql, [id]);
    return res.json({ Status: true, Result: rows });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching attendance records" });
  }
});

/* Route to fetch attendance by employee number
router.get('/attendance/:id', (req, res) => {
  const empNo = req.params.emp_no;
  const sql = "SELECT * FROM `attendance` WHERE emp_no = ?";  // Adjust table and column names as needed

  con.query(sql, [empNo], (err, result) => {
    if (err) {
      console.error("Error fetching attendance data:", err);
      return res.status(500).json({ Status: false, Error: "Database error" });
    }
    return res.status(200).json({ Status: true, Result: result });
  });
});*/

// Get employee home
router.get('/home/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  try {
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query error" });
  }
});

// Get employee files
router.get('/files/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employee WHERE id = ?";
  try {
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query error" });
  }
});

// Logout endpoint
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

// Change password endpoint
router.post('/change-password/:id', async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword } = req.body;

  const getPasswordSql = "SELECT password FROM employee WHERE id = ?";
  try {
    const [rows] = await pool.query(getPasswordSql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, Error: "Employee not found" });
    }

    const hashedPassword = rows[0].password;
    const isMatch = await bcryptjs.compare(currentPassword, hashedPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, Error: "Current password is incorrect" });
    }

    const newHashedPassword = await bcryptjs.hash(newPassword, 10);
    const updatePasswordSql = "UPDATE employee SET password = ? WHERE id = ?";
    await pool.query(updatePasswordSql, [newHashedPassword, id]);

    return res.status(200).json({ success: true, Message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, Error: "Error changing password" });
  }
});

// Leave request endpoint
router.post('/leave', async (req, res) => {
  const { emp_id, name, start_date, end_date, status, reason } = req.body;
  const leave_no = uuidv4(); // Generate a unique leave number

  const sql = "INSERT INTO `leave` (emp_id, leave_no, name, start_date, end_date, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)";
  try {
    await pool.query(sql, [emp_id, leave_no, name, start_date, end_date, status, reason]);
    return res.status(200).json({
      success: true,
      message: "Leave request submitted successfully.",
      leaveRequest: { leave_no }
    });
  } catch (err) {
    console.error("Error inserting leave request:", err);
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

// Fetch leave records by employee ID
router.get('/leave/:emp_id', async (req, res) => {
  const emp_id = req.params.emp_id;
  const sql = "SELECT * FROM `leave` WHERE emp_id = ?";
  try {
    const [rows] = await pool.query(sql, [emp_id]);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching leave data:", err);
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

// Cancel leave request endpoint
router.delete('/leave/:emp_id/:leave_id', async (req, res) => {
  const { emp_id, leave_id } = req.params;
  const sql = "DELETE FROM `leave` WHERE emp_id = ? AND id = ?";
  try {
    const [result] = await pool.query(sql, [emp_id, leave_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }
    return res.status(200).json({ success: true, message: "Leave request cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling leave request:", err);
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

// Fetching leave records with optional date range
router.get('/totalleave/:id', async (req, res) => {
  const id = req.params.id;
  const { startDate, endDate } = req.query;
  let sql = "SELECT * FROM `leave` WHERE emp_id = ?";
  const params = [id];

  if (startDate && endDate) {
    sql += " AND date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  try {
    const [rows] = await pool.query(sql, params);
    return res.json({ Status: true, Result: rows });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching leave records" });
  }
});

// Fetch total pending leave of an employee
router.get('/total_pending/:id', async (req, res) => {
  const sql = "SELECT COUNT(id) AS totalPending FROM `leave` WHERE emp_id = ? AND status = 'Pending'";
  try {
    const [rows] = await pool.query(sql, [req.params.id]);
    return res.json({ Status: true, Result: rows[0].totalPending });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Fetch total fulfilled leave of an employee
router.get('/total_fulfilled/:id', async (req, res) => {
  const sql = "SELECT COUNT(id) AS totalFulfilled FROM `leave` WHERE emp_id = ? AND status = 'Fulfilled'";
  try {
    const [rows] = await pool.query(sql, [req.params.id]);
    return res.json({ Status: true, Result: rows[0].totalFulfilled });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Fetch total rejected leave of an employee
router.get('/total_rejected/:id', async (req, res) => {
  const sql = "SELECT COUNT(id) AS totalRejected FROM `leave` WHERE emp_id = ? AND status = 'Rejected'";
  try {
    const [rows] = await pool.query(sql, [req.params.id]);
    return res.json({ Status: true, Result: rows[0].totalRejected });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Get employee details
router.get("/employee/details/:id", async (req, res) => {
  const sql = "SELECT * FROM employee WHERE id = ?";
  try {
    const [rows] = await pool.query(sql, [req.params.id]);
    if (rows.length === 0) {
      return res.json({ Status: false, Error: "Employee not found" });
    }
    return res.json({ Status: true, Result: rows[0] });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Fetch total late
router.get('/total_late/:emp_no', async (req, res) => {
  const sql = "SELECT SUM(late) AS totalLate FROM `attendance` WHERE emp_no = ?";
  try {
    const [rows] = await pool.query(sql, [req.params.emp_no]);
    return res.json({ Status: true, Result: rows[0].totalLate });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Fetch total overtime
router.get('/total_overtime/:emp_no', async (req, res) => {
  const sql = "SELECT SUM(extra) AS totalOvertime FROM `attendance` WHERE emp_no = ?";
  try {
    const [rows] = await pool.query(sql, [req.params.emp_no]);
    return res.json({ Status: true, Result: rows[0].totalOvertime });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Query Error" });
  }
});

// Fetch total present
router.get('/total_present/:emp_no', async (req, res) => {
  const sql = "SELECT COUNT(time_in) AS totalPresent FROM attendance WHERE emp_no = ?";
  try {
    const [rows] = await pool.query(sql, [req.params.emp_no]);
    return res.json({ Status: true, Result: rows[0].totalPresent });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error fetching total present days" });
  }
});

export { router as employeeRouter };
