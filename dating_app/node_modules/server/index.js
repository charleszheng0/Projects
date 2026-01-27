const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
const auth = require('./routes/auth');
app.use('/api/auth', auth.router);
const presence = require('./routes/presence');
app.use('/api/presence', presence);
const windows = require('./routes/windows');
app.use('/api/windows', windows);
const users = require('./routes/users');
app.use('/api/users', users);

const { startScheduler } = require('./scheduler');
startScheduler();

app.get('/', (req, res) => {
    res.send('Immunity API is running. Radical transparency active.');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
