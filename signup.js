// const bcrypt = require('bcrypt');

// const createUser = async (db, name, email, password) => {
//   try {
//     const hashedPassword = await bcrypt.hash(password, 10); // PASSWORD HASHING yahin ho raha hai

//     const query = 'INSERT INTO if0_38815680_usersmain (name, email, password) VALUES (?, ?, ?)';
//     const [results] = await db.promise().query(query, [name, email, hashedPassword]);

//     return true;
//   } catch (err) {
//     console.error('Signup Error:', err.message);
//     throw err;
//   }
// };

// module.exports = { createUser };


const bcrypt = require('bcrypt');

const createUser = async (User, name, email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();
    return true;
  } catch (err) {
    console.error('Signup Error:', err.message);
    throw err;
  }
};
localStorage.setItem('isLoggedIn', 'true');
window.location.replace('dashboard.html');

module.exports = { createUser };
