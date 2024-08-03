import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '../.env' });

// Log the environment variables to see if they are loaded
console.log('Loaded environment variables:', process.env);

// Ensure the JWT_SECRET_KEY is set
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET_KEY) {
    console.error('JWT_SECRET_KEY is not set in environment variables');
    process.exit(1); // Exit the script with an error code
}

// Example function to generate a token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET_KEY,
    { expiresIn: '1h' }
  );
};

// Example user object
const user = {
  id: 1,
  role: 'admin'
};

// Generate a token
const token = generateToken(user);
console.log('Generated Token:', token);
