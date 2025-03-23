const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { generate_roadmap } = require('./services');
const app = express();
app.use(express.json());
app.use(cors())


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate-roadmap', async (req, res) => {
  const concept = req.body.concept;
  if (!concept) {
    return res.status(400).send({ error: 'Concept is required' });
  }

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `you are an expert in the field of ${concept}. Create an extensive, tree-like roadmap for learning ${concept}
         from absolute beginner to expert level, do not be vague, keep it simple and short, very pratical and all project focused! and ensure it tackles the concept and 
         best approaches to mastery it only add things are extremely needed and useful core things that are pratical. Each node in the tree should represent
          a significant learning milestone or topic area that can pratical. The root node should introduce basics of ${concept}. From there, 
          expand into more complex topics that are essential to mastering ${concept}, ensuring each category is broken down into detailed 
          sub-topics where applicable. Each node should have a title and a list of children nodes  have a title and a list of children nodes that have same properties format of the parent node, 
          indicating the progression of topics to learn. return in a json object`
      },
      {
        role: "system",
        content: `this is the json format i want the output -{
        "root": {
          "title": "Introduction to Machine Learning",
          "children": [
            {
              "title": "Basic Concepts",
              "children": [
                {
                  "title": "What is Machine Learning?",
                  "children": []
                },
                {
                  "title": "Types of Machine Learning",
                  "children": [
                    {
                      "title": "Supervised Learning",
                      "children": []
                    },
                    {
                      "title": "Unsupervised Learning",
                      "children": []
                    },
                    {
                      "title": "Reinforcement Learning",
                      "children": []
                    }
                  ]
                },
                {
                  "title": "Applications of Machine Learning",
                  "children": []
                }
              ]
            }, `
      }
      ],

      response_format: { type: "json_object" },
    }).then(resx =>
      res.json(JSON.parse(resx.choices[0].message.content))
    );




  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).send({ error: 'Failed to generate roadmap' });
  }
});

// New endpoint to create ephemeral session token for Realtime API
// Keep track of active sessions to avoid creating too many
const activeSessionsCache = {
  token: null,
  expiresAt: null,
  isDummy: false
};

app.post('/create-realtime-session', async (req, res) => {
  try {
    // Check if we have a valid cached session token
    const now = new Date();
    if (activeSessionsCache.token && activeSessionsCache.expiresAt && new Date(activeSessionsCache.expiresAt) > now) {
      console.log('Using cached session token');
      return res.status(200).json({
        sessionToken: activeSessionsCache.token,
        expires: activeSessionsCache.expiresAt,
        isDummy: activeSessionsCache.isDummy || false
      });
    }

    // Create a new realtime session token
    console.log('Creating new session token');
    try {
      const session = await openai.beta.realtime.sessions.create({
        model: "gpt-4o-realtime-preview"
      });

      console.log('Session response:', JSON.stringify(session));

      // Check if the session object has the expected properties
      if (!session || !session.token) {
        throw new Error('Invalid session response from OpenAI API: ' + JSON.stringify(session));
      }

      // Cache the token
      activeSessionsCache.token = session.token;
      activeSessionsCache.expiresAt = session.expires_at;
      activeSessionsCache.isDummy = false;

      return res.status(200).json({
        sessionToken: session.token,
        expires: session.expires_at,
        isDummy: false
      });
    } catch (apiError) {
      console.error('OpenAI API error:', apiError.message);

      // Return a dummy token for fallback testing (the frontend will eventually switch to fallback mode)
      const dummyToken = "dummy_token_" + Math.random().toString(36).substring(2, 15);
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1); // Expires in 1 hour

      // Cache the dummy token
      activeSessionsCache.token = dummyToken;
      activeSessionsCache.expiresAt = expiryDate.toISOString();
      activeSessionsCache.isDummy = true;

      return res.status(200).json({
        sessionToken: dummyToken,
        expires: expiryDate.toISOString(),
        isDummy: true
      });
    }
  } catch (error) {
    console.error('Error creating realtime session:', error);

    // Create a fallback dummy token even for unexpected errors
    const dummyToken = "error_dummy_token_" + Math.random().toString(36).substring(2, 15);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // Expires in 1 hour

    return res.status(200).json({
      sessionToken: dummyToken,
      expires: expiryDate.toISOString(),
      isDummy: true,
      error: error.message
    });
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('message', (message) => {
    console.log('message received:', message);
    socket.emit('response', `Server received: ${message}`);
  });
  socket.on('generate-roadmap', (concept) => {
    generate_roadmap(concept, socket);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});
// const PORT = process.env.PORT || 4555;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

const PORT = process.env.PORT || 4555;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});