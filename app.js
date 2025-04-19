const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt'); 
require('dotenv').config();

const { loginUser } = require('./login'); 
const { createUser } = require('./signup'); 

const app = express();
const PORT = 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database!');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultSecret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth');
  }
});

app.get('/auth', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/auth');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(db, email, password);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    req.session.user = { id: user.id, email: user.email };
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const newUser = await createUser(db, name, email, password); 

    if (newUser) res.redirect('/auth');
    else res.status(400).json({ message: 'Signup failed. Please try again.' });
  } catch (error) {
    res.status(500).json({ message: 'Error during signup' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Error logging out' });
    res.redirect('/auth');
  });
});

app.get('/forgot', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot.html'));
});

app.post('/forgot', (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(20).toString('hex');
  const expiry = Date.now() + 3600000;

  const query = 'UPDATE usersmain SET reset_token = ?, token_expiry = ? WHERE email = ?';
  db.query(query, [token, expiry, email], (err, result) => {
    if (err) return res.status(500).send('Database error');

    if (result.affectedRows === 0) {
      return res.status(404).send('Email not found');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const resetLink = `http://localhost:3000/reset/${token}`;
    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(500).send('Failed to send email');
      res.send('Reset link sent to your email');
    });
  });
});

app.get('/reset/:token', (req, res) => {
  const token = req.params.token;
  const query = 'SELECT * FROM usersmain WHERE reset_token = ? AND token_expiry > ?';
  db.query(query, [token, Date.now()], (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).send('Invalid or expired token');
    }
    res.sendFile(path.join(__dirname, 'public', 'reset.html'));
  });
});

app.post('/reset/:token', async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;

  const query = 'SELECT * FROM usersmain WHERE reset_token = ? AND token_expiry > ?';
  db.query(query, [token, Date.now()], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).send('Invalid or expired token');
    }

    const userId = results[0].id;
    const hashedPassword = await bcrypt.hash(password, 10); 

    const updateQuery = 'UPDATE usersmain SET password = ?, reset_token = NULL, token_expiry = NULL WHERE id = ?';
    db.query(updateQuery, [hashedPassword, userId], (updateErr) => {
      if (updateErr) return res.status(500).send('Error updating password');
      res.send('Password reset successful');
    });
  });
});

app.get('/user-info', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });

  const query = 'SELECT name, email FROM usersmain WHERE id = ?';
  db.query(query, [req.session.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
