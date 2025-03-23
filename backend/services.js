const { OpenAI } = require("openai");
const jsonAutocomplete = require("json-autocomplete");
const { count } = require("console");
const fs = require("fs");

require("dotenv").config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
async function generate_roadmap(concept, socket) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        {
          role: "system",
          content: `you are an expert in the field of ${concept}. Create an extensive, tree-like roadmap for learning ${concept}
           do not be vague, keep it simple and short, very pratical and all project focused! and ensure it tackles the concept and 
             best approaches to mastery it only add things are extremely needed and useful core things that are pratical. Each node in the tree should represent
              a significant learning milestone or topic area that can pratical. The root node should introduce basics of ${concept}. From there, 
              expand into more complex topics that are essential to mastering ${concept}, ensuring each category is broken down into detailed 
              sub-topics where applicable. Each node should have a title and a list of children nodes  have a title and a list of children nodes that have same properties format of the parent node, 
              indicating the progression of topics to learn. return in a json object`,
        },
        {
          role: "system",
          content: `this is the json format i want the output in this array
        [
          {
            "title": "Introduction to Machine Learning",
            "children": [
              {
                "title": "Basic Concepts",
                "children": [
                  {
                    "title": "What is Machine Learning?",
                    "children": [
                      {
                        "title": "What is Machine Learning?",
                        "children": []
                      }
                    ]
                  }
                  {
                    "title": "Types of Machine Learning",
                    "children": [
                      {
                        "title": "Supervised Learning",
                        "children": []
                      }
    
                    ]
                  }
                  {
                    "title": "Applications of Machine Learning",
                    "children": []
                  }
    
                ]
              }
            ]
          }
        ]
           `,
        },
      ],

      response_format: { type: "json_object" },
    });
    let countx = 0;
    let data = ""; // To accumulate the chunks of response data
    for await (const part of stream) {
      const chunk = part.choices[0].delta.content || "";
      data += chunk;

      if (countx > 8) {
        if (data.length < 200) {
          console.log(jsonAutocomplete(data));
        }

        socket.emit("stream", jsonAutocomplete(data)); // Emit each chunk to the client
      }

      countx++;
    }

    socket.emit("stream", jsonAutocomplete(data)); // Emit the final accumulated data
    socket.emit("done_stream", "done");

    // Process the data and generate the roadmap data structure
    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data);
      // Process into nodes and edges for react-flow
      const processedData = treeToGraph(jsonData);

      // Emit the processed roadmap
      console.log("Emitting roadmap event with processed data");
      socket.emit("roadmap", processedData);
    } catch (processError) {
      console.error("Error processing roadmap data:", processError);
      socket.emit("error", "Failed to process roadmap data");
    }

    // Save the final accumulated data to a file
    fs.writeFileSync("data.json", data, "utf8");
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    socket.emit("error", "Failed to generate roadmap");
  }
}

// Function to convert JSON tree structure to graph format for React Flow
function treeToGraph(treeData) {
  let nodes = [];
  let edges = [];
  let nodeId = 0;

  // Check if treeData is an array (handle different response formats)
  const rootNode = Array.isArray(treeData)
    ? treeData[0]
    : treeData.root || treeData;

  // Process the tree recursively
  function processNode(node, parentId = null, level = 0, position = 0) {
    const currentId = `node-${nodeId++}`;

    // Add the node
    nodes.push({
      id: currentId,
      data: { label: node.title },
      position: { x: position * 250, y: level * 100 },
    });

    // Add edge if this isn't the root node
    if (parentId !== null) {
      edges.push({
        id: `edge-${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
      });
    }

    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        processNode(
          child,
          currentId,
          level + 1,
          position - node.children.length / 2 + index
        );
      });
    }
  }

  processNode(rootNode);
  return [nodes, edges];
}

// Function to fetch and structure content for a specific node
async function fetchNodeContent(nodeName, concept) {
  try {
    // Use child_process to call our Python scraping functions
    const { spawn } = require("child_process");
    const { promisify } = require("util");
    const exec = promisify(require("child_process").exec);

    // Construct a search query that combines the concept and node name
    const searchQuery = `${concept} ${nodeName}`;
    console.log(`Fetching content for: ${searchQuery}`);

    // Call the Python FastAPI endpoint to get web search results - updated path
    let searchResults = [];
    let apiResponse = null; // Move declaration here so it's in the right scope

    try {
      const { stdout, stderr } = await exec(
        `curl -X GET "http://localhost:8000/scraping/search?query=${encodeURIComponent(
          searchQuery
        )}&limit=5"`
      );

      if (stderr && !stderr.includes("Total") && !stderr.includes("Received")) {
        console.error(`Error from Python API: ${stderr}`);
      }

      try {
        apiResponse = JSON.parse(stdout);
        if (apiResponse.web && Array.isArray(apiResponse.web)) {
          searchResults = apiResponse.web;
        }
      } catch (jsonError) {
        console.error("Error parsing API response:", jsonError);
        console.log("API response:", stdout.substring(0, 500) + "...");
        // Fallback to using OpenAI if web scraping fails
      }
    } catch (error) {
      console.error("Error calling Python API:", error);
      // Continue with OpenAI fallback
    }

    // Use OpenAI to structure the content about this specific topic
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let prompt = `Create educational content about "${nodeName}" in the context of ${concept}.`;

    // If we have web search results, include them in the prompt
    if (searchResults.length > 0) {
      prompt += ` Use the following information from web searches:\n\n`;
      searchResults.forEach((result, index) => {
        prompt += `Source ${index + 1} (${result.title} - ${result.url}):\n`;
        if (result.paragraphs && result.paragraphs.length > 0) {
          // Include up to 3 paragraphs per source
          const paragraphs = result.paragraphs.slice(0, 3);
          paragraphs.forEach((p) => {
            prompt += `- ${p}\n`;
          });
        }
        prompt += "\n";
      });
    }

    prompt += `\nStructure your response as a JSON object with an array of content items under a 'content' key, where each item has:
    1. "type": either "text" or "code"
    2. "content": the actual text or code snippet
    3. "programming_language": (only for code items) the language of the code

    For text items, use proper markdown formatting:
    - Use # for main heading, ## for subheadings
    - Use **bold** for important terms
    - Use *italic* for emphasis
    - Use proper bullet lists with - or numbered lists
    - Break content into digestible paragraphs
    
    Include:
    - A brief introduction with a main heading (# Heading)
    - Several subheadings (## Subheading) for different aspects/topics
    - Key concepts and principles with proper formatting
    - Best practices with bullet points
    
    IMPORTANT: Only include code examples if they are directly related to ${nodeName} and ${concept}. 
    Do not add pseudocode, placeholders, or generic examples at the end of the response.
    If code examples are not relevant to this topic, do not include any code items at all.
    
    Make it comprehensive but focused specifically on ${nodeName} as it relates to ${concept}.
    
    Return your response in valid JSON format.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = JSON.parse(completion.choices[0].message.content);

    // Ensure the content property exists and is an array
    if (!responseContent.content || !Array.isArray(responseContent.content)) {
      console.log(
        "OpenAI response missing content array or has incorrect format, creating default structure"
      );
      console.log(
        "Response was:",
        JSON.stringify(responseContent).substring(0, 200) + "..."
      );

      // Try to adapt to different formats that might be returned
      let contentArray = [];

      if (Array.isArray(responseContent)) {
        // If the response is an array directly
        contentArray = responseContent;
      } else if (
        responseContent.items &&
        Array.isArray(responseContent.items)
      ) {
        // If the response has items array
        contentArray = responseContent.items;
      } else if (responseContent.data && Array.isArray(responseContent.data)) {
        // If the response has data array
        contentArray = responseContent.data;
      } else {
        // Create a default response
        contentArray = [
          {
            type: "text",
            content: `# ${nodeName}\n\nInformation about ${nodeName} in the context of ${concept}.`,
          },
        ];
      }

      // Standardize the response format
      responseContent.content = contentArray;
    }

    // Add video and image references if available
    if (searchResults.length > 0 && apiResponse) {
      try {
        // We already have the search results which include videos and images
        // Let's use what we have instead of making a new API call
        if (apiResponse && apiResponse.video && apiResponse.video.length > 0) {
          // Add video references to the content
          responseContent.content.push({
            type: "text",
            content: "## Recommended Videos",
          });

          apiResponse.video.slice(0, 3).forEach((video) => {
            if (video.title && video.url) {
              // Convert YouTube URL to embed format if needed
              let videoUrl = video.url;

              // Handle YouTube URLs to prepare them for embedding
              if (
                videoUrl.includes("youtube.com") ||
                videoUrl.includes("youtu.be")
              ) {
                // Extract video ID
                let videoId = "";

                if (videoUrl.includes("youtube.com/watch?v=")) {
                  videoId = videoUrl.split("watch?v=")[1].split("&")[0];
                } else if (videoUrl.includes("youtu.be/")) {
                  videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
                } else if (videoUrl.includes("youtube.com/embed/")) {
                  videoId = videoUrl.split("embed/")[1].split("?")[0];
                }

                if (videoId) {
                  videoUrl = `https://www.youtube.com/embed/${videoId}`;
                }
              }

              responseContent.content.push({
                type: "video",
                content: videoUrl,
                title: video.title,
              });
            }
          });
        }

        // Add images references if available
        if (apiResponse && apiResponse.image && apiResponse.image.length > 0) {
          responseContent.content.push({
            type: "text",
            content: "## Related Images",
          });

          apiResponse.image.slice(0, 3).forEach((image) => {
            if (image.url) {
              // Validate and fix image URLs
              let imageUrl = image.url;

              // Make sure URL has proper http/https
              if (!imageUrl.startsWith("http")) {
                imageUrl = "https://" + imageUrl.replace(/^\/\//, "");
              }

              // Only skip certain problematic formats, allow JPG/JPEG
              if (imageUrl.match(/\.(svg|ico)(\?|$)/i)) {
                return;
              }

              // Try to detect and skip fake or tiny images
              if (
                imageUrl.includes("1x1.") ||
                imageUrl.includes("pixel.") ||
                imageUrl.includes("spacer.") ||
                imageUrl.includes("blank.") ||
                imageUrl.includes("transparent.")
              ) {
                return;
              }

              // Handle URLs with special characters
              try {
                const encodedUrl = encodeURI(imageUrl);

                // Use our proxy for all image URLs to avoid CORS issues
                const proxiedImageUrl = `http://localhost:4555/proxy-image?url=${encodedUrl}`;

                console.log(
                  `Adding image: ${
                    image.title || "Related image"
                  } - ${proxiedImageUrl}`
                );

                // Extract file extension for debugging
                const extension = imageUrl.split(".").pop().toLowerCase();
                console.log(`Image file extension: ${extension}`);

                responseContent.content.push({
                  type: "image",
                  content: proxiedImageUrl,
                  title: image.title || "Related image",
                  originalUrl: imageUrl, // Store original URL for fallback
                  extension: extension, // Store the extension for debugging
                });
              } catch (urlError) {
                console.error("Error processing image URL:", urlError);
              }
            }
          });
        }
      } catch (mediaError) {
        console.error("Error processing media content:", mediaError);
      }
    }

    return responseContent.content || [];
  } catch (error) {
    console.error("Error in fetchNodeContent:", error);

    // Return fallback content if there's an error
    return [
      {
        type: "text",
        content: `# ${nodeName}\n\nInformation about ${nodeName} is currently being gathered. Please try again later.`,
      },
    ];
  }
}

module.exports = { generate_roadmap, fetchNodeContent };
