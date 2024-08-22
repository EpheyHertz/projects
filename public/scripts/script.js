document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginToggle = document.getElementById('loginToggle');
    const signupToggle = document.getElementById('signupToggle');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');

    loginToggle.addEventListener('click', () => {
        toggleForms('login');
    });

    signupToggle.addEventListener('click', () => {
        toggleForms('signup');
    });

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms('signup');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms('login');
    });

    function toggleForms(form) {
        if (form === 'login') {
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            loginToggle.classList.add('active');
            signupToggle.classList.remove('active');
        } else {
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            signupToggle.classList.add('active');
            loginToggle.classList.remove('active');
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginData = {
            email: loginForm.querySelector('#loginEmail').value,
            password: loginForm.querySelector('#loginPassword').value
        };

        fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Logged in successfully!');
            } else {
                alert('Login failed: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const signupData = {
            username: signupForm.querySelector('#signupUsername').value,
            email: signupForm.querySelector('#signupEmail').value,
            password: signupForm.querySelector('#signupPassword').value
        };

        fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Signed up successfully!');
            } else {
                alert('Signup failed: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });
});
