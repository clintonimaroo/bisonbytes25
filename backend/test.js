require("dotenv").config();
const jsonAutocomplete = require("json-autocomplete");

const { OpenAI } = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function call_openai(concept){
    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        stream: true,
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
        {role:"system",
      content:`this is the json format i want the output -
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
      })
    let data = ''; // To accumulate the chunks of response data
    // console.log(stream.choices[0].message.content)
      for await (const part of stream) {
        const chunk = part.choices[0].delta.content || "";
        data += chunk; // Accumulate the chunks
      
        console.log(jsonAutocomplete(data)); // Outputs: {"user":{"id":123}}

      }
  
   
  
  }

  call_openai("Machine Learning")

