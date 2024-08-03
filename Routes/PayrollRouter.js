import express from "express";
import pool from "../utils/db.js";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";

const router = express.Router();

// Logout endpoint
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: true });
});

// Create Payroll route
router.post('/createpayroll', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  try {
    // Check if the email already exists
    const [existingPaychecks] = await pool.query('SELECT * FROM payroll WHERE email = ?', [email]);
    
    if (existingPaychecks.length > 0) {
      return res.json({ Status: false, Error: 'Email is already used' });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert the new payroll record
    const sql = 'INSERT INTO payroll (email, fname, lname, password) VALUES (?, ?, ?, ?)';
    await pool.query(sql, [email, fname, lname, hashedPassword]);

    return res.json({ Status: true, Message: 'Payroll created successfully' });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: 'Error processing request' });
  }
});
export {router as payrollRouter}
