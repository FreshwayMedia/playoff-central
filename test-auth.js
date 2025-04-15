const axios = require('axios');
require('dotenv').config({ path: './production.env' });

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://web-production-319e7.up.railway.app' 
    : 'http://localhost:3001';

async function testAuth() {
    try {
        // Test registration
        console.log('Testing registration...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Registration successful:', registerResponse.data);

        // Test login
        console.log('Testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Login successful:', loginResponse.data);

        // Test invalid login
        console.log('Testing invalid login...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('Invalid login test passed:', error.response.data);
        }

        console.log('All authentication tests passed successfully!');
    } catch (error) {
        console.error('Authentication test failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testAuth(); 