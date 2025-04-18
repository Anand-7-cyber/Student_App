const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL client

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt'); 
require('dotenv').config();

const { loginUser } = require('./login'); 
const { createUser } = require('./signup'); 

const app = express();
const PORT = 3000;

// PostgreSQL pool setup
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// Middleware to handle PostgreSQL queries
const dbQuery = async (query, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
};

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
    const user = await loginUser(pool, email, password); // PostgreSQL login
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
    const newUser = await createUser(pool, name, email, password); // PostgreSQL signup

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

  const query = 'UPDATE usersmain SET reset_token = $1, token_expiry = $2 WHERE email = $3';
  dbQuery(query, [token, expiry, email])
    .then(result => {
      if (result.rowCount === 0) return res.status(404).send('Email not found');

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
    })
    .catch(err => res.status(500).send('Database error'));
});

app.get('/reset/:token', (req, res) => {
  const token = req.params.token;
  const query = 'SELECT * FROM usersmain WHERE reset_token = $1 AND token_expiry > $2';
  dbQuery(query, [token, Date.now()])
    .then(results => {
      if (results.rowCount === 0) return res.status(400).send('Invalid or expired token');
      res.sendFile(path.join(__dirname, 'public', 'reset.html'));
    })
    .catch(err => res.status(500).send('Database error'));
});

app.post('/reset/:token', async (req, res) => {
  const token = req.params.token;
  const { password } = req.body;

  const query = 'SELECT * FROM usersmain WHERE reset_token = $1 AND token_expiry > $2';
  dbQuery(query, [token, Date.now()])
    .then(async results => {
      if (results.rowCount === 0) return res.status(400).send('Invalid or expired token');

      const userId = results.rows[0].id;
      const hashedPassword = await bcrypt.hash(password, 10);

      const updateQuery = 'UPDATE usersmain SET password = $1, reset_token = NULL, token_expiry = NULL WHERE id = $2';
      dbQuery(updateQuery, [hashedPassword, userId])
        .then(() => res.send('Password reset successful'))
        .catch(updateErr => res.status(500).send('Error updating password'));
    })
    .catch(err => res.status(500).send('Database error'));
});

app.get('/user-info', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });

  const query = 'SELECT name, email FROM usersmain WHERE id = $1';
  dbQuery(query, [req.session.user.id])
    .then(results => {
      if (results.rowCount === 0) return res.status(404).json({ message: 'User not found' });
      res.json(results.rows[0]);
    })
    .catch(err => res.status(500).json({ message: 'DB error' }));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
