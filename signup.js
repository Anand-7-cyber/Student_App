const bcrypt = require('bcrypt');

const createUser = async (db, name, email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // PASSWORD HASHING yahin ho raha hai

    const query = 'INSERT INTO if0_38815680_usersmain (name, email, password) VALUES (?, ?, ?)';
    const [results] = await db.promise().query(query, [name, email, hashedPassword]);

    return true;
  } catch (err) {
    console.error('Signup Error:', err.message);
    throw err;
  }
};

module.exports = { createUser };
