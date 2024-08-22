const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { User } = require('../models');


// Signup Route
exports.signup = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        res.json({ message: 'User created successfully', user });
        
    } catch (error) {
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ where: { email } });
        
        // Check if user exists and password is correct
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).render('login', { error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log(user.id);
        console.log(token);

        // Store the token in a cookie (optional, depends on your use case)
        
        // Render the home page with the username
        return res.json({
            token:token,
            userId:user.id,
            username:user.username
        });

    } catch (error) {
        console.error('Login error:', error);
        // Handle unexpected errors
        return res.status(500).render('login', { error: 'An unexpected error occurred' });
    }
};