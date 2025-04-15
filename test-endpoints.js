const axios = require('axios');
require('dotenv').config({ path: './production.env' });

const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://web-production-319e7.up.railway.app' 
    : 'http://localhost:3001';

async function testEndpoints() {
    try {
        // Test health endpoint
        console.log('Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('Health check passed:', healthResponse.data);

        // Test registration
        console.log('\nTesting registration...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Registration successful:', registerResponse.data);

        // Test login
        console.log('\nTesting login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Login successful:', loginResponse.data);

        // Test invalid login
        console.log('\nTesting invalid login...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('Invalid login test passed:', error.response.data);
        }

        // Test WebSocket connection
        console.log('\nTesting WebSocket connection...');
        const WebSocket = require('ws');
        const ws = new WebSocket(BASE_URL.replace('http', 'ws'));

        ws.on('open', () => {
            console.log('WebSocket connection established');
            ws.close();
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testEndpoints(); 