const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Route to provide ENV keys to frontend safely (Optional)
// Note: In a production app, you should proxy requests instead of exposing keys.
// For this standalone app, we send config to client.
app.get('/config', (req, res) => {
    res.json({
        GEMINI_API: process.env.GEMINI_API,
        JSON_MASTER_ID: process.env.JSON_MASTER_ID,
        JSON_BIN_ID: process.env.JSON_BIN_ID
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 Tamil AI Studio Server running at: http://localhost:${PORT}`);
    console.log(`🌟 Environment loaded successfully.\n`);
});