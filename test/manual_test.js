const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
let token = '';
let chatId = 0;

async function testBackend() {
    console.log('--- STARTING BACKEND TESTS ---');

    // 1. Signup
    console.log('\n1. Testing Signup...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser_' + Date.now(), password: 'password123' })
    });
    const signupData = await signupRes.json();
    console.log('Signup Response:', signupRes.status, signupData);

    // 2. Login
    console.log('\n2. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: signupData.username || 'testuser', password: 'password123' }) // Note: signup doesn't return username, using logic
    });

    // Fix: use the username we just created
    const loginRes2 = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: JSON.parse(signupRes.config?.data || signupRes.body || '{}').username || ('testuser_' + Date.now()), password: 'password123' })
    });
    // Actually simpler: let's just use a fixed username for the test run or capture it better.
    // Re-doing logical flow properly below.
}

(async () => {
    const username = 'user_' + Math.floor(Math.random() * 10000);
    const password = 'securePass123';

    try {
        // 1. Signup
        console.log(`\n--- 1. Signup (${username}) ---`);
        const r1 = await fetch(`${BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        console.log('Status:', r1.status);
        console.log('Body:', await r1.json());

        // 2. Login
        console.log(`\n--- 2. Login ---`);
        const r2 = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const d2 = await r2.json();
        console.log('Status:', r2.status);
        if (d2.token) {
            token = d2.token;
            console.log('Token received.');
        } else {
            console.error('Login failed, aborting.');
            return;
        }

        // 3. Create Chat (Helper)
        console.log(`\n--- 3. Create Chat ---`);
        const r3 = await fetch(`${BASE_URL}/chat/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({}) // 1-on-1 logic ignored for simplicity
        });
        const d3 = await r3.json();
        console.log('Status:', r3.status);
        console.log('Body:', d3);
        if (d3.chatId) chatId = d3.chatId;

        // 4. Send Message
        if (chatId) {
            console.log(`\n--- 4. Send Message (Chat ${chatId}) ---`);
            const r4 = await fetch(`${BASE_URL}/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ chatId, message: 'Hello from test script!' })
            });
            console.log('Status:', r4.status);
            console.log('Body:', await r4.json());

            // 5. Fetch Messages
            console.log(`\n--- 5. Fetch Messages ---`);
            const r5 = await fetch(`${BASE_URL}/chat/${chatId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Status:', r5.status);
            console.log('Messages:', await r5.json());
        }

    } catch (e) {
        console.error('Test failed:', e);
    }
})();
