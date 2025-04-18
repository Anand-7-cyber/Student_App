const bcrypt = require('bcrypt');

const createUser = async (pool, name, email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // PASSWORD HASHING

    const query = 'INSERT INTO usersmain (name, email, password) VALUES ($1, $2, $3)';
    await pool.query(query, [name, email, hashedPassword]);

    return true;
  } catch (err) {
    console.error('Signup Error:', err.message);
    throw err;
  }
};

module.exports = { createUser };
