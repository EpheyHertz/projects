const express = require('express');
const { signup, login } = require('../controllers/authController');
const app =express()
const path=require('path')
const router = express.Router();


router.post('/signup', signup);
router.post('/login',login);

// app.get('/signup', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'signupandlogin.html'));
// });
// app.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'signupandlogin.html'));
// });


module.exports = router;
