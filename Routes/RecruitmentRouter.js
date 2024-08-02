import express from "express";
import con from "../utils/db.js";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";


const router = express.Router();


router.get('/logout', (req, res) => {
  res.clearCookie('token')
  return res.json({Status: true})
})

// image upload
const storage = multer.diskStorage({
  destination:(req, file, cb) => {
    cb(null, 'Public/Images')
  },
  filename: (req, file, cb)=> {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
  }

})
const upload = multer({
  storage: storage
})
// end image upload

router.post("/add_employee", upload.single('image'), (req, res) => {
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ?";
  const sqlInsertEmployee = `
    INSERT INTO employee
    (emp_no, fname, mname, lname, gender, birth_date, phone_number, perma_address, date_hired, pay_frequency, rate_per_hour, rate_per_day, employee_status, department, project, position, email, password, salary, start_time, out_time, image)
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

            const values = [
              req.body.emp_no,
              req.body.fname,
              req.body.mname,
              req.body.lname,
              req.body.gender,
              req.body.birth_date,
              req.body.phone_number,
              req.body.perma_address,
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
              req.file.filename
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

import { unlink } from 'fs/promises'; // Using fs promises API for unlink

router.delete('/delete_employee/:id', async (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT image FROM employee WHERE id = ?";
  const deleteSql = "DELETE FROM employee WHERE id = ?";
  
  try {
    // Step 1: Retrieve the image filename associated with the employee
    con.query(selectSql, [id], async (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows.length === 0) {
        return res.json({ Status: false, Error: "Employee not found" });
      }
      
      const imageFilename = rows[0].image;
      
      // Step 2: Delete the employee record from the database
      con.query(deleteSql, [id], async (err) => {
        if (err) {
          throw err;
        }
        // Step 3: Delete the associated image file from the file system
        const imagePath = `Public/Images/${imageFilename}`;
        await unlink(imagePath);
        // Image file deleted successfully
        console.log("Image file deleted successfully");
        return res.json({ Status: true, Message: "Employee and associated image deleted successfully" });
      });
    });
  } catch (err) {
    console.error(err);
    return res.json({ Status: false, Error: "Error deleting employee and associated image" });
  }
});

router.put('/edit_employee/:id', (req, res) => {
  const id = req.params.id;
  const sqlCheckEmpNo = "SELECT id FROM employee WHERE emp_no = ? AND id != ?";
  const sqlCheckEmail = "SELECT id FROM employee WHERE email = ? AND id != ?";
  const sqlUpdateEmployee = `UPDATE employee 
      SET emp_no = ?, fname = ?, mname = ?, lname = ?, gender = ?, birth_date = ?, phone_number = ?, perma_address = ?, date_hired = ?, pay_frequency = ?, rate_per_day = ?, rate_per_hour = ?, employee_status = ?, department = ?, project =?, position = ?, email = ?, salary = ?, start_time = ?, out_time = ?
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

  const values = [
      req.body.emp_no,
      req.body.fname,
      req.body.mname,
      req.body.lname,
      req.body.gender,
      req.body.birth_date,
      req.body.phone_number,
      req.body.perma_address,
      req.body.date_hired,
      req.body.pay_frequency,
      req.body.rate_per_day,
      req.body.rate_per_hour,
      req.body.employee_status,
      req.body.department,
      req.body.project,
      req.body.position,
      req.body.email,
      req.body.salary,
      req.body.start_time,
      req.body.out_time,
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


export {router as recruitmentRouter}