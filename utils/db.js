import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection to the database
const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.PORT
});

// Connect to the database
con.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

// Export the connection object
export default con;
