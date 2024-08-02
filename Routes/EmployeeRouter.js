import express from "express";
import con from "../utils/db.js";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';


const router = express.Router();

router.post("/employeelogin", (req, res) => {
  const sql = "SELECT * from employee Where email = ?";
  con.query(sql, [req.body.email], (err, result) => {
      if (err) return res.json({ loginStatus: false, Error: "Query error" });

      if (result.length > 0) {
          const employee = result[0];

          if (employee.employee_status !== 'active') {
              return res.json({ loginStatus: false, Error: "Employee is currently inactive" });
          }

          bcryptjs.compare(req.body.password, employee.password, (err, response) => {
              if (err) return res.json({ loginStatus: false, Error: "Wrong Password" });

              if (response) {
                  const email = employee.email;
                  const token = jwt.sign(
                      { role: "employee", email, id: employee.id },
                      "employee_secret_key",
                      { expiresIn: "1d" }
                  );
                  res.cookie("token", token);
                  return res.json({ loginStatus: true, id: employee.id });
              } else {
                  return res.json({ loginStatus: false, Error: "Wrong Password" });
              }
          });
      } else {
          return res.json({
              loginStatus: false,
              Error: "Oops! Something went wrong. Please check your credentials and try again."
          });
      }
  });
});

// Get employee details
router.get('/detail/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee where id = ?"
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Status: false });
        return res.json(result);
    })
});

//fetch attendance by view all
router.get('/attendance/:id', async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM attendance WHERE emp_no = ?";
  
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching attendance records" });
    }
    return res.json({ Status: true, Result: result });
  });
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
router.get('/home/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee where id = ?"
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Status: false });
        return res.json(result);
    })
});

// Get employee files
router.get('/files/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee where id = ?"
    con.query(sql, [id], (err, result) => {
        if (err) return res.json({ Status: false });
        return res.json(result);
    })
});

// Logout endpoint
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({ Status: true });
});

// Change password endpoint
router.post('/change-password/:id', (req, res) => {
    const id = req.params.id;
    const { currentPassword, newPassword } = req.body;

    // Query to get the current password from the database
    const getPasswordSql = "SELECT password FROM employee WHERE id = ?";
    con.query(getPasswordSql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false });
        if (result.length === 0) return res.status(404).json({ success: false });

        const hashedPassword = result[0].password;

        // Compare current password with the stored password
        bcryptjs.compare(currentPassword, hashedPassword, (err, isMatch) => {
            if (err) return res.status(500).json({ success: false });
            if (!isMatch) return res.status(400).json({ success: false });

            // Hash the new password
            bcryptjs.hash(newPassword, 10, (err, newHashedPassword) => {
                if (err) return res.status(500).json({ success: false });

                // Update the password in the database
                const updatePasswordSql = "UPDATE employee SET password = ? WHERE id = ?";
                con.query(updatePasswordSql, [newHashedPassword, id], (err, result) => {
                    if (err) return res.status(500).json({ success: false });
                    return res.status(200).json({ success: true });
                });
            });
        });
    });
});

// Leave request endpoint
router.post('/leave', (req, res) => {
  const { emp_id, name, start_date, end_date, status, reason } = req.body;
  const leave_no = uuidv4(); // Generate a unique leave number

  const sql = "INSERT INTO `leave` (emp_id, leave_no, name, start_date, end_date, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)";

  con.query(sql, [emp_id, leave_no, name, start_date, end_date, status, reason], (err, result) => {
    if (err) {
      console.error("Error inserting leave request:", err);
      return res.status(500).json({ success: false, error: "Database error" });
    }
    return res.status(200).json({
      success: true,
      message: "Leave request submitted successfully.",
      leaveRequest: {
      leave_no, // Include the leave number in the response
      }
    });
  });
});

// Route to fetch all leave data for a specific employee
router.get('/leave/:emp_id', (req, res) => {
  const { emp_id } = req.params;
  const sql = "SELECT * FROM `leave` WHERE emp_id = ?";

  con.query(sql, [emp_id], (err, results) => {
    if (err) {
      console.error("Error fetching leave data:", err);
      return res.status(500).json({ success: false, error: "Database error" });
    }
    return res.status(200).json(results);
  });
});

// Cancel leave request endpoint
router.delete('/leave/:emp_id/:leave_id', (req, res) => {
  const { emp_id, leave_id } = req.params;
  const sql = "DELETE FROM `leave` WHERE emp_id = ? AND id = ?";
  
  con.query(sql, [emp_id, leave_id], (err, result) => {
    if (err) {
      console.error("Error cancelling leave request:", err);
      return res.status(500).json({ success: false, error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }
    return res.status(200).json({ success: true, message: "Leave request cancelled successfully" });
  });
});


// Fetch leave records by employee ID
router.get('/leave/:id', (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM leave WHERE emp_id = ?";
  
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching leave records" });
    }
    return res.json(result);
  });
});

// fetching leave
router.get('/totalleave/:id', async (req, res) => {
  const id = req.params.id;
  const { startDate, endDate } = req.query;
  let sql = "SELECT * FROM leave WHERE emp_id = ?";
  const params = [id];

  if (startDate && endDate) {
    sql += " AND date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  con.query(sql, params, (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching leave records" });
    }
    return res.json({ Status: true, Result: result });
  });
});

// Fetch total pending leave of an employee
router.get('/total_pending/:id', (req, res) => {
  const sql = "SELECT COUNT(id) AS totalPending FROM `leave` WHERE emp_id = ? AND status = 'Pending'";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].totalPending });
  });
});

// Fetch total pending fulfilled of an employee
router.get('/total_fulfilled/:id', (req, res) => {
  const sql = "SELECT COUNT(id) AS totalFulfilled FROM `leave` WHERE emp_id = ? AND status = 'Fulfilled'";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].totalFulfilled });
  });
});

// Fetch total pending rejected of an employee
router.get('/total_rejected/:id', (req, res) => {
  const sql = "SELECT COUNT(id) AS totalRejected FROM `leave` WHERE emp_id = ? AND status = 'Rejected'";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].totalRejected });
  });
});

//get employee
router.get("/employee/details/:id", (req, res) => {
  const sql = "SELECT * FROM employee WHERE id = ?";
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result });
  });
});

// Fetch total late
router.get('/total_late/:emp_no', (req, res) => {
  const sql = "SELECT SUM(late) AS totalLate FROM `attendance` WHERE emp_no = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].totalLate });
  });
});

// Fetch total overtime
router.get('/total_overtime/:emp_no', (req, res) => {
  const sql = "SELECT SUM(extra) AS totalOvertime FROM `attendance` WHERE emp_no = ?";
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Status: false, Error: "Query Error" });
    return res.json({ Status: true, Result: result[0].totalLate });
  });
});

// Fetch total present
router.get('/total_present/:emp_no', (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT COUNT(time_in) AS totalPresent
    FROM attendance
    WHERE emp_no = ?
  `;
  con.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ Status: false, Error: "Error fetching total present days" });
    }
    return res.json({ Status: true, Result: result[0].totalPresent });
  });
});

export { router as employeeRouter };
