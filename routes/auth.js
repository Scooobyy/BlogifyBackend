require('dotenv').config();

const express = require('express');

const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const fetchuser = require('./middleware/fetchuser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const JWT_SECRET = process.env.JWT_SECRET;



// Route 1: Create a new user
router.post('/createuser', [
    body('name', 'Name is required').notEmpty(),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const email = req.body.email.toLowerCase().trim();
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        // Pass plain password; hashing is done by schema pre-save hook
        user = await User.create({
            name: req.body.name,
            email,
            password: req.body.password,
            role: req.body.role || 'user'
        });

        const data = { user: { id: user.id, role: user.role } };
        const authToken = jwt.sign(data, JWT_SECRET);

        res.json({ token: authToken });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route 2: Login user
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials (user not found)' });
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ error: 'Invalid credentials (wrong password)' });
        }

        const data = { user: { id: user.id, role: user.role } };
        const authToken = jwt.sign(data, JWT_SECRET);

        res.json({ token: authToken });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route 3: Get logged-in user details (protected)
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'connect.blogify@gmail.com',
        pass: 'libv dkek qkym kzqq'  // use environment variables in production!
    }
});

// Route to request password reset (send OTP)
router.post('/forgot-password', [
    body('email', 'Enter a valid email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ error: 'No user found with this email' });
        }

        const otp = crypto.randomBytes(3).toString('hex');

        user.resetToken = otp;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
        await user.save();

        const mailOptions = {
            from: 'fitnessgeek0805@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'OTP sent to your email address.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Route to verify OTP and reset password
router.post('/reset-password', [
    body('email', 'Enter a valid email').isEmail(),
    body('otp', 'OTP is required').notEmpty(),
    body('newPassword', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ error: 'No user found with this email' });
        }

        if (user.resetToken !== otp || user.resetTokenExpiry < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Assign plain password; pre-save hook will hash it
        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
