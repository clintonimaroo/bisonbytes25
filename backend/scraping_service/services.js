const { OpenAI } = require('openai');
const jsonAutocomplete = require("json-autocomplete");
const { count } = require('console');
const fs = require('fs');

require('dotenv').config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
async function generate_roadmap(concept, socket) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [{
        role: "system",
        content: `you are an expert in the field of ${concept}. Create an extensive, tree-like roadmap for learning ${concept}
           do not be vague, keep it simple and short, very pratical and all project focused! and ensure it tackles the concept and 
             best approaches to mastery it only add things are extremely needed and useful core things that are pratical. Each node in the tree should represent
              a significant learning milestone or topic area that can pratical. The root node should introduce basics of ${concept}. From there, 
              expand into more complex topics that are essential to mastering ${concept}, ensuring each category is broken down into detailed 
              sub-topics where applicable. Each node should have a title and a list of children nodes  have a title and a list of children nodes that have same properties format of the parent node, 
              indicating the progression of topics to learn. return in a json object`
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
           `
      }
      ],

      response_format: { type: "json_object" },
    });
    let countx = 0
    let data = ''; // To accumulate the chunks of response data
    for await (const part of stream) {
      const chunk = part.choices[0].delta.content || "";
      data += chunk;


      if (countx > 8) {
        if (data.length < 200) {
          console.log(jsonAutocomplete(data))
        }

        socket.emit('stream', jsonAutocomplete(data)); // Emit each chunk to the client

      }

      countx++



    }

    socket.emit('stream', jsonAutocomplete(data)); // Emit the final accumulated data
    socket.emit('done_stream', 'done');

    // Process the data and generate the roadmap data structure
    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data);
      // Process into nodes and edges for react-flow
      const processedData = treeToGraph(jsonData);

      // Emit the processed roadmap
      console.log('Emitting roadmap event with processed data');
      socket.emit('roadmap', processedData);
    } catch (processError) {
      console.error('Error processing roadmap data:', processError);
      socket.emit('error', 'Failed to process roadmap data');
    }

    // Save the final accumulated data to a file
    fs.writeFileSync('data.json', data, 'utf8');
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    socket.emit('error', 'Failed to generate roadmap');
  }


}

// Function to convert JSON tree structure to graph format for React Flow
function treeToGraph(treeData) {
  let nodes = [];
  let edges = [];
  let nodeId = 0;

  // Check if treeData is an array (handle different response formats)
  const rootNode = Array.isArray(treeData) ? treeData[0] : treeData.root || treeData;

  // Process the tree recursively
  function processNode(node, parentId = null, level = 0, position = 0) {
    const currentId = `node-${nodeId++}`;

    // Add the node
    nodes.push({
      id: currentId,
      data: { label: node.title },
      position: { x: position * 250, y: level * 100 }
    });

    // Add edge if this isn't the root node
    if (parentId !== null) {
      edges.push({
        id: `edge-${parentId}-${currentId}`,
        source: parentId,
        target: currentId
      });
    }

    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        processNode(
          child,
          currentId,
          level + 1,
          position - (node.children.length / 2) + index
        );
      });
    }
  }

  processNode(rootNode);
  return [nodes, edges];
}

module.exports = { generate_roadmap };

