import mysql from 'mysql2';

// Create a connection to the database
const con = mysql.createConnection({
  host: 'srv1364.hstgr.io',
  user: 'u362138419_rcramoscc',
  password: 'RCramosCC1',
  database: 'u362138419_hrisrcramoscc'
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
