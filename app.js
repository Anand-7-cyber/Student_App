require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');

const { loginUser } = require('./login');
const { createUser } = require('./signup');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Connection
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

// Middleware
app.use(cors());
app.use(bodyParser.json());
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

// Routes
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

// User Info
app.get('/user-info', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });

  const query = 'SELECT name, email FROM usersmain WHERE id = ?';
  db.query(query, [req.session.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  });
});

// Contact Form Handler
app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MINDORA_EMAIL,
      pass: process.env.MINDORA_PASSWORD
    }
  });


  const mailOptions = {
    from: email,  // User ka email address jo form mein dala
    to: process.env.MINDORA_EMAIL,  // Aapka email address (receiver address)
    replyTo: email,  // Agar user reply kare, toh uska email address
    subject: `New Contact: ${subject}`,
    html: `
      <h2>Mindora Contact Form</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
    `
  };
  

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Your message has been sent successfully!' });
  } catch (err) {
    console.error('Email failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
