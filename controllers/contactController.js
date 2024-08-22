const nodemailer = require('nodemailer');

exports.contact = async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'your_email@gmail.com',
                pass: 'your_email_password'
            }
        });

        const mailOptions = {
            from: email,
            to: 'your_email@gmail.com',
            subject: 'Contact Form Submission',
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};
