import express from "express";
import con from "../utils/db.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

const router = express.Router();

  router.get('/logout', (req, res) => {
    res.clearCookie('token')
    return res.json({Status: true})
  })

 // Create Payroll route
 router.post('/createpayroll', async (req, res) => {
  const { email, fname, lname, password } = req.body;
  if (!email || !fname || !lname || !password) {
    return res.json({ Status: false, Error: 'All fields are required' });
  }

  con.query('SELECT * FROM payroll WHERE email = ?', [email], async (err, result) => {
    if (err) {
      return res.json({ Status: false, Error: 'Query error' });
    }
    if (result.length > 0) {
      return res.json({ Status: false, Error: 'Email is already used' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO payroll (email, fname, lname, password) VALUES (?, ?, ?, ?)';
    con.query(sql, [email, fname, lname, hashedPassword], (err, result) => {
      if (err) {
        return res.json({ Status: false, Error: 'Insert error' });
      }
      return res.json({ Status: true, Message: 'Payroll created successfully' });
    });
  });
});

export {router as payrollRouter}
