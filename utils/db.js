import mysql from 'mysql2';

// Create a connection to the database
const con = mysql.createConnection({
  host: '192.168.1.9',
  user: 'u362138419_hrisrcramos',
  password: 'RCramosCC1',
  database: 'u362138419_rcramoscc1'
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
