"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from "next/image";
import './styles/home.scss';
import Sidebar from "./components/Sidebar";

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import Editor from "@monaco-editor/react";

import 'reactflow/dist/style.css';
import { tree, treeToGraph, treeToGraphHorizontal, treex } from './data';
import axios from 'axios';
import { ArrowDown, ArrowUp, ChevronsLeft, ChevronsRight, Fullscreen, Maximize, Minimize } from 'lucide-react';
import { io } from 'socket.io-client';
import { sax } from './tt';

const socket = io('http://localhost:4555');
function FloatChart({ roadmap, onNodeClick }) {


  // const baseTree = treeToGraph(roadmap);

  const initialNodes = roadmap[0];
  const initialEdges = roadmap[1];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  useEffect(() => {
    setNodes(roadmap[0]);
    setEdges(roadmap[1]);
  }, [roadmap]);


  return (

    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onClick={(e) => {

          onNodeClick(e.target.textContent)
        }}

      // fitView

      // layoutOptions={{
      //   orientation: 'horizontal'
      // }}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={20} size={1.5} />
      </ReactFlow>
    </div>
  );
}
export default function Home() {
  console.log(sax.content)
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [concept, setConcept] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [loader, setLoader] = useState(false)
  const [nodeDetails, setNodeDetails] = useState(null)
  const [nodeDetailsVisible, setNodeDetailsVisible] = useState(false)
  const [nodeFullScreen, setNodeFullScreen] = useState(false)
  const [isWakeWordMode, setIsWakeWordMode] = useState(true);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const recognitionRef = useRef(null);
  const wakeWordAudioRef = useRef(null);

  // async function generateRoadmap(){
  //   setLoader(true)
  //   axios.post("http://localhost:4555/generate-roadmap",{
  //     "concept":transcript
  //   }).then(
  //     res=>{
  //       setRoadmap(res.data)
  //       setLoader(false)
  //     }
  //   )
  // }
  const svg_btn_color = transcript.length == 0 ? "#8e939c" : "#fff"
  // useEffect(() => {
  //   const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  //   const recognition = new speechRecognition();

  //   recognition.continuous = true;
  //   recognition.interimResults = true;
  //   recognition.lang = 'en-US';

  //   recognition.onresult = (event) => {
  //     const current = event.resultIndex;
  //     const result = event.results[current][0];
  //     if (result.isFinal && result.confidence > 0.7) {
  //       setTranscript(prevTranscript => prevTranscript + ' ' + result.transcript);
  //     }
  //   };

  //   if (isListening) {
  //     recognition.start();
  //   } else {
  //     recognition.stop();
  //   }

  //   return () => {
  //     recognition.stop();
  //   };
  // }, [isListening]);

  // const toggleListening = () => {
  //   setIsListening(!isListening);

  // };
  const [endText, setEndText] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create wake word audio element
      wakeWordAudioRef.current = new Audio('/wake-word.mp3');

      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

        const recognition = recognitionRef.current;
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const last = event.results.length - 1;
          const text = event.results[last][0].transcript;
          console.log('Recognized text:', text);

          if (isWakeWordMode) {
            // Check for wake word in continuous listening mode
            if (text.toLowerCase().includes('hey buddy')) {
              console.log('Wake word detected: "Hey Buddy"');
              wakeWordAudioRef.current.play(); // Play notification sound
              setIsWakeWordMode(false);
              setIsProcessingCommand(true);
              setIsListening(true);

              // Restart recognition to clear buffer
              try {
                recognition.stop();
                setTimeout(() => {
                  try {
                    recognition.start();
                  } catch (error) {
                    console.error('Error restarting recognition after wake word:', error);
                  }
                }, 500);
              } catch (error) {
                console.error('Error stopping recognition after wake word:', error);
              }
            }
          } else if (isProcessingCommand) {
            // Process the actual command after wake word
            console.log('Processing command:', text);
            setTranscript(text);

            // If the command has stopped for a moment, process it
            if (event.results[last].isFinal) {
              setIsProcessingCommand(false);
              // Wait a bit and go back to wake word mode
              setTimeout(() => {
                if (text.trim().length > 0) {
                  generateRoadmap();
                }
                setIsWakeWordMode(true);
              }, 1000);
            }
          }
        };

        recognition.onend = () => {
          // Restart recognition if it's in wake word mode
          if (isWakeWordMode) {
            try {
              recognition.start();
            } catch (error) {
              console.error('Error restarting recognition in onend handler:', error);
              // If we failed to restart, try again after a short delay
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (innerError) {
                  console.error('Failed to restart recognition after delay:', innerError);
                }
              }, 300);
            }
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          // Handle specific error types
          if (event.error === 'aborted' || event.error === 'network') {
            // These errors might require a restart
            setTimeout(() => {
              try {
                if (isWakeWordMode) {
                  recognition.start();
                }
              } catch (error) {
                console.error('Error restarting after recognition error:', error);
              }
            }, 500);
          }
        };

        // Start listening for wake word
        if (isWakeWordMode) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Error starting initial recognition:', error);
          }
        }
      } else {
        console.error('SpeechRecognition is not supported in this browser');
      }
    }

    return () => {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition on cleanup:', error);
        }
      }
    };
  }, [isWakeWordMode, isProcessingCommand]);

  const startRecognition = () => {
    if (recognitionRef.current) {
      try {
        // Check if recognition is already running
        if (isListening) {
          console.log('Recognition is already running, no need to start again');
          return;
        }
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        // If recognition is already running and we get an error, try stopping first
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (innerError) {
              console.error('Error restarting recognition after stop:', innerError);
            }
          }, 300);
        } catch (stopError) {
          console.error('Error stopping recognition before restart:', stopError);
        }
      }
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      setEndText(true);
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };

  async function toggleListening() {
    if (isListening) {
      stopRecognition();
      setIsListening(false);
      setIsWakeWordMode(true);
    } else {
      setIsWakeWordMode(false);
      setIsProcessingCommand(true);
      startRecognition();
      setIsListening(true);
    }
  }

  useEffect(() => {
    socket.on('stream', (data) => {
      try {

        setRoadmap(treeToGraph([JSON.parse(data)]));
      }
      catch (e) {
        console.log(e)
      }

    });
    socket.on('done_stream', (data) => {
      console.log('final_data', roadmap)
      setLoader(false)
    })
    socket.on('error', (error) => {
      console.error('Error:', error);
    });

    socket.on("response", (data) => {

    })

    return () => {
      socket.off('stream');
      socket.off('error');
    };
  }, []);

  function onNodeClick(node) {
    setNodeDetails({
      "title": node
    })
    setNodeDetailsVisible(true)
  }

  const generateRoadmap = () => {
    // socket.emit("message",transcript)
    if (transcript.trim().length === 0) return;

    setLoader(true)
    setRoadmap([]);
    socket.emit('generate-roadmap', transcript);
    setTranscript('')
  };

  return (
    <div className="home">
      <Sidebar />
      <div className="app">
        <div className="top">
          {roadmap && <FloatChart roadmap={roadmap} onNodeClick={onNodeClick} />}
          {/* {treex &&          <FloatChart roadmap={treex}/>} */}
        </div>
        <div className="bottom">
          {loader == true && <LoadingSpinner />}
          <div className="input-div">
            <div className="input-box">
              <div className="left">
                <div className="mic" onClick={() => {
                  toggleListening()
                }}>
                  {isListening ?
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 4C8.67157 4 8 4.67157 8 5.5V18.5C8 19.3284 8.67157 20 9.5 20C10.3284 20 11 19.3284 11 18.5V5.5C11 4.67157 10.3284 4 9.5 4Z" fill="currentColor"></path><path d="M13 8.5C13 7.67157 13.6716 7 14.5 7C15.3284 7 16 7.67157 16 8.5V15.5C16 16.3284 15.3284 17 14.5 17C13.6716 17 13 16.3284 13 15.5V8.5Z" fill="currentColor"></path><path d="M4.5 9C3.67157 9 3 9.67157 3 10.5V13.5C3 14.3284 3.67157 15 4.5 15C5.32843 15 6 14.3284 6 13.5V10.5C6 9.67157 5.32843 9 4.5 9Z" fill="currentColor"></path><path d="M19.5 9C18.6716 9 18 9.67157 18 10.5V13.5C18 14.3284 18.6716 15 19.5 15C20.3284 15 21 14.3284 21 13.5V10.5C21 9.67157 20.3284 9 19.5 9Z" fill="currentColor"></path></svg> :
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 4C8.67157 4 8 4.67157 8 5.5V18.5C8 19.3284 8.67157 20 9.5 20C10.3284 20 11 19.3284 11 18.5V5.5C11 4.67157 10.3284 4 9.5 4Z" fill="currentColor" opacity="0.3"></path><path d="M13 8.5C13 7.67157 13.6716 7 14.5 7C15.3284 7 16 7.67157 16 8.5V15.5C16 16.3284 15.3284 17 14.5 17C13.6716 17 13 16.3284 13 15.5V8.5Z" fill="currentColor" opacity="0.3"></path><path d="M4.5 9C3.67157 9 3 9.67157 3 10.5V13.5C3 14.3284 3.67157 15 4.5 15C5.32843 15 6 14.3284 6 13.5V10.5C6 9.67157 5.32843 9 4.5 9Z" fill="currentColor" opacity="0.3"></path><path d="M19.5 9C18.6716 9 18 9.67157 18 10.5V13.5C18 14.3284 18.6716 15 19.5 15C20.3284 15 21 14.3284 21 13.5V10.5C21 9.67157 20.3284 9 19.5 9Z" fill="currentColor" opacity="0.3"></path></svg>
                  }
                </div>
                <textarea type="text" placeholder="Generate a roadmap, learn anything." value={transcript} onChange={(e) => setTranscript(e.target.value)}

                />
              </div>
              <div className="right">
                <button className={transcript.length == 0 ? "disabled" : ""} onClick={generateRoadmap}

                >
                  {/* <svg xmlns="http://www.w3.org/2000/svg" viewBox={svg_btn_color} fill="currentColor" class="h-4 w-4">
                    <path d="M200 32v144a8 8 0 0 1-8 8H67.31l34.35 34.34a8 8 0 0 1-11.32 11.32l-48-48a8 8 0 0 1 0-11.32l48-48a8 8 0 0 1 11.32 11.32L67.31 168H184V32a8 8 0 0 1 16 0Z"></path>
                  </svg> */}
                  <ArrowUp color={svg_btn_color} />
                </button>
              </div>
            </div>
          </div>
          <div className="select-div">
            <label htmlFor="">
              Detailed
            </label>
            <i class='bx bx-chevron-down'></i>
          </div>

        </div>
      </div>

      <div className={nodeDetailsVisible == false ? "node-details-div hidden" : nodeFullScreen == true ? "node-details-div full-screen" : "node-details-div"}>
        <div className="node-body">
          <div className="top">
            <div className="left">


              <a onClick={() => setNodeDetailsVisible(false)}  ><ChevronsRight color='#9ca3af' /></a>
              <a onClick={() => setNodeFullScreen(!nodeFullScreen)}>
                {nodeFullScreen == true ? <Minimize color='#9ca3af' size={20} /> : <Fullscreen color='#9ca3af' size={20} />}
              </a>
            </div>
          </div>
          {
            nodeDetails == null ?
              <div className="node-content">
                <div className="title">
                  Select a node to view details
                </div>
              </div>
              :
              <div className="node-content">
                <div className="title">
                  {nodeDetails.title}
                </div>

                <div className="content">
                  {
                    sax.content.map((item, index) => (
                      <div className="item" key={index}>
                        {item.content}
                        {item.type == 'code' && <Editor value={item.content} language={item.programming_language}
                          theme="vs-dark"
                          height={item.content.split("\n").length * 23.5}


                          options={{
                            inlineSuggest: true,
                            fontSize: "16px",
                            readOnly: true,
                            formatOnType: true,
                            autoClosingBrackets: true,
                            minimap: { scale: 10 }
                          }}
                        />}
                      </div>
                    ))
                  }
                </div>
              </div>
          }

        </div>

      </div>
    </div>
  );
}


function LoadingSpinner() {
  const options = [
    'Generating Roadmap',

  ];

  const [currentIndex, setCurrentIndex] = useState(0);



  return (
    <div className="loaders-status-div">
      {options.slice(0, currentIndex + 1).map((option, index) => (
        <div className="section" key={index}>
          {currentIndex == index ? <span className="loader-x"></span> : <i className='bx bxs-check-circle'></i>}
          <label>{option}</label>
        </div>
      ))}
    </div>
  );
}