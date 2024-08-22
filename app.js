const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
require('dotenv').config();
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAnalytics } = require('firebase/analytics');

// Import your Sequelize models here
const { User } = require('./models'); // Adjust the path as needed

const app = express();
app.set('view engine', 'ejs');

// Middleware for parsing JSON bodies
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'public'));

// Session setup
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new LocalStrategy(
    async (username, password, done) => { // Use `username` instead of `email` for LocalStrategy
        try {
            const user = await User.findOne({ where: { email: username } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return done(null, false, { message: 'Invalid credentials' });
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, { id: user.id, username: user.username });
});

passport.deserializeUser(async (user, done) => {
    try {
        const foundUser = await User.findByPk(user.id);
        done(null, foundUser);
    } catch (error) {
        done(error);
    }
});

// Route to render the index.ejs file
app.get('/', (req, res) => {
    res.render('index');
});

// Sign Up and Login Routes
app.get('/signup', (req, res) => {
    res.render('signupandlogin');
});

app.get('/login', (req, res) => {
    res.render('signupandlogin');
});

// Generate Blog Route
app.get('/generate_blog', (req, res) => {
    let data = { username: 'james doe' };
    res.render('home', data);
});

// Log Out Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Route protection middleware
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ error: 'Unauthorized: You need to log in.' });
    }
}

// Blog Routes
app.get('/blog/blogs', isAuthenticated, async (req, res) => {
    try {
        const blog = await BlogPost.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
    res.sendFile(path.join(__dirname, 'public', 'allblogpost.html'));
});

// Firebase Configuration
// const firebaseConfig = {
//     apiKey: "AIzaSyB3F5-YTgNboSlSF95LeS8MkaWuoMcJxW4",
//     authDomain: "aibloggenerator-e646d.firebaseapp.com",
//     projectId: "aibloggenerator-e646d",
//     storageBucket: "aibloggenerator-e646d.appspot.com",
//     messagingSenderId: "957582879797",
//     appId: "1:957582879797:web:295870ad0299215bfb957c",
//     measurementId: "G-FGYJSBWHSE"
// };

// const firebaseApp = initializeApp(firebaseConfig);
// const analytics = getAnalytics(firebaseApp);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
