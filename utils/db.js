import mysql2 from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const con = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

con.connect(function(err) {
    if (err) {
        console.error("Connection error: ", err.message);
        console.error("Error details: ", err);
    } else {
        console.log("Connected to the MySQL database.");
    }
});

export default con;
