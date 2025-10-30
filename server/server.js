const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, chatId } = req.body;

        console.log('Received chat request:', { chatId, messageLength: message?.length });

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Validate message length
        if (message.length > 1000) {
            return res.status(400).json({ error: 'Message too long' });
        }

        const aiResponse = await getAIResponse(message);

        console.log('AI response generated successfully');

        res.json({
            response: aiResponse,
            chatId: chatId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
        });
    }
});

async function getAIResponse(userMessage) {
    console.log('Calling OpenRouter API...');
    
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key is missing');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.SITE_URL || 'https://your-app.vercel.app',
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
        console.error('OpenRouter API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'AI Chatbot API',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access your chatbot at: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI Model: ${process.env.AI_MODEL || 'openai/gpt-3.5-turbo'}`);
});

// Export for Vercel
module.exports = app;