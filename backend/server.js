const express = require("express");
const { OpenAI } = require("openai");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { generate_roadmap, fetchNodeContent } = require("./services");
const bodyParser = require("body-parser");
const axios = require("axios");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-roadmap", async (req, res) => {
  const concept = req.body.concept;
  if (!concept) {
    return res.status(400).send({ error: "Concept is required" });
  }

  try {
    const openaiResponse = await openai.chat.completions
      .create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `you are an expert in the field of ${concept}. Create an extensive, tree-like roadmap for learning ${concept}
         from absolute beginner to expert level, do not be vague, keep it simple and short, very pratical and all project focused! and ensure it tackles the concept and 
         best approaches to mastery it only add things are extremely needed and useful core things that are pratical. Each node in the tree should represent
          a significant learning milestone or topic area that can pratical. The root node should introduce basics of ${concept}. From there, 
          expand into more complex topics that are essential to mastering ${concept}, ensuring each category is broken down into detailed 
          sub-topics where applicable. Each node should have a title and a list of children nodes  have a title and a list of children nodes that have same properties format of the parent node, 
          indicating the progression of topics to learn. return in a json object`,
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
            }, `,
          },
        ],

        response_format: { type: "json_object" },
      })
      .then((resx) => res.json(JSON.parse(resx.choices[0].message.content)));
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    res.status(500).send({ error: "Failed to generate roadmap" });
  }
});

// New endpoint to fetch content for a specific node
app.post("/node-content", async (req, res) => {
  const { nodeName, concept } = req.body;

  if (!nodeName || !concept) {
    return res
      .status(400)
      .send({ error: "Node name and concept are required" });
  }

  try {
    const content = await fetchNodeContent(nodeName, concept);
    res.json({ content });
  } catch (error) {
    console.error("Error generating node content:", error);
    res.status(500).send({ error: "Failed to generate content" });
  }
});

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("generate-roadmap", (concept) => {
    console.log("Received request to generate roadmap for:", concept);
    generate_roadmap(concept, socket);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Add a proxy endpoint for images to bypass CORS
app.get("/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send("Image URL is required");
  }

  console.log("Proxying image:", imageUrl);

  try {
    // Add timeout to avoid hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increase timeout for larger images

    // Handle redirects manually to avoid fetch limitations
    let finalUrl = imageUrl;
    let redirectCount = 0;
    let fetchResponse;

    while (redirectCount < 5) {
      // Limit redirects to prevent infinite loops
      console.log(`Fetching URL (attempt ${redirectCount + 1}):`, finalUrl);

      fetchResponse = await fetch(finalUrl, {
        signal: controller.signal,
        headers: {
          // Try to mimic a browser request
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.google.com/",
          Connection: "keep-alive",
        },
        redirect: "manual", // Handle redirects manually
      });

      if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
        // This is a redirect
        const location = fetchResponse.headers.get("location");
        if (location) {
          finalUrl = new URL(location, finalUrl).toString();
          redirectCount++;
          continue;
        }
      }

      // Not a redirect or no location header, exit the loop
      break;
    }

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      console.error(
        `Failed to fetch image: ${fetchResponse.status} ${fetchResponse.statusText}`
      );
      return res
        .status(fetchResponse.status)
        .send(`Failed to fetch image: ${fetchResponse.statusText}`);
    }

    // Forward all headers from the original response
    const headersToForward = [
      "content-type",
      "content-length",
      "cache-control",
      "expires",
      "date",
    ];
    headersToForward.forEach((header) => {
      const value = fetchResponse.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Ensure we have a content-type, default to jpeg if it's missing
    const contentType = fetchResponse.headers.get("content-type");
    if (contentType) {
      console.log("Image content type from server:", contentType);
      res.setHeader("Content-Type", contentType);
    } else {
      // Try to determine content type from URL extension
      if (
        finalUrl.toLowerCase().endsWith(".jpg") ||
        finalUrl.toLowerCase().endsWith(".jpeg")
      ) {
        console.log(
          "Setting content type to image/jpeg based on URL extension"
        );
        res.setHeader("Content-Type", "image/jpeg");
      } else if (finalUrl.toLowerCase().endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (finalUrl.toLowerCase().endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif");
      } else {
        // Default
        res.setHeader("Content-Type", "image/jpeg");
      }
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day

    // Stream the image data
    fetchResponse.body.pipe(res);
  } catch (error) {
    console.error("Error proxying image:", error);

    if (error.name === "AbortError") {
      return res.status(504).send("Image request timed out");
    }

    res.status(500).send("Error proxying image: " + error.message);
  }
});

const PORT = process.env.PORT || 4555;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
