const bcrypt = require('bcrypt');

const loginUser = async (db, email, password) => {
  try {
    // Step 1: Find user by email
    const [results] = await db.promise().query('SELECT * FROM usersmain WHERE email = ?', [email]);

    // Step 2: If user found, compare password
    if (results.length === 0) {
      console.log('User not found with email:', email);
      return null;
    }

    const user = results[0];
    console.log("Entered password:", password);
    console.log("Stored hashed password:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      console.log("Login successful for:", email);
      return user;
    } else {
      console.log("Invalid password for:", email);
      return null;
    }

  } catch (err) {
    console.error('Error during login:', err.message);
    throw new Error('Login failed due to server error');
  }
};

module.exports = { loginUser };
