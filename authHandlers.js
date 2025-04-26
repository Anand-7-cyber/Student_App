const bcrypt = require('bcrypt');
const User = require('./models/user'); // Assuming User model is exported from this path

// **Signup Handler**
const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.redirect('/auth');
  } catch (error) {
    res.status(500).json({ message: 'Signup failed. Try again.' });
  }
};

// **Login Handler**
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create session for the user
    req.session.user = { id: user._id, email: user.email };
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
};

module.exports = { createUser, loginUser };
