import mysql from 'mysql2';

const connection = mysql.createConnection({
  host: '153.92.15.18', // Or use 
  user: 'u362138419_rcramoscc',
  password: 'RCramosCC1',
  database: 'u362138419_hrisrcramoscc',
  port: 3306 // Default MySQL port
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Connected as id ' + connection.threadId);
});

export default con;