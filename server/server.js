const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, chatId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Validate message length
        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long' });
        }

        const aiResponse = await getAIResponse(message);

        res.json({
            response: aiResponse,
            chatId: chatId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message
        });
    }
});

async function getAIResponse(userMessage) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': 'Professional AI Chatbot'
        },
        body: JSON.stringify({
            model: process.env.AI_MODEL || 'openai/gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful, professional AI assistant. 
                    Provide clear, concise, and accurate responses. 
                    Be friendly but maintain professionalism. 
                    If you're unsure about something, admit it rather than guessing.
                    Format your responses in a readable way with proper paragraphs.`
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'AI Chatbot API'
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access your chatbot at: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});