import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT,
});

// Export the pool object for use in other modules
export default pool;