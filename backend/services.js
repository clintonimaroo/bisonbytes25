const { OpenAI } = require('openai');
const jsonAutocomplete = require("json-autocomplete");
const { count } = require('console');
const fs = require('fs');

require('dotenv').config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
async function generate_roadmap(concept,socket){
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
          {role:"system",
        content:`this is the json format i want the output in this array
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

        
          if(countx>8){
            if(data.length<200){
              console.log(jsonAutocomplete(data))
            }

              socket.emit('stream', jsonAutocomplete(data)); // Emit each chunk to the client
            
          }
          
          countx++

          
       
        }
        
        socket.emit('stream',jsonAutocomplete(data)); // Emt the final accumulated data
        socket.emit('done_stream','done')

        // Save the final accumulated data to a file
        fs.writeFileSync('data.json', data, 'utf8');
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        socket.emit('error', 'Failed to generate roadmap');
    }
   
  
  }

  module.exports = {generate_roadmap};

