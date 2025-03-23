"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import "./styles/home.scss";
import "./components/mic-active.css";
import Sidebar from "./components/Sidebar";
import WakeWordDetector from "./components/WakeWordDetector";
import StatusIndicator from "./components/StatusIndicator";

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import Editor from "@monaco-editor/react";

import "reactflow/dist/style.css";
import { tree, treeToGraph, treeToGraphHorizontal, treex } from "./data";
import axios from "axios";
import {
  ArrowDown,
  ArrowUp,
  ChevronsLeft,
  ChevronsRight,
  Fullscreen,
  Maximize,
  Minimize,
} from "lucide-react";
import { io } from "socket.io-client";
import { sax } from "./tt";
import aiService from "../services/ai-service";

const socket = io("http://localhost:4555");
function FloatChart({ roadmap, onNodeClick }) {
  // const baseTree = treeToGraph(roadmap);

  const initialNodes = roadmap[0];
  const initialEdges = roadmap[1];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    setNodes(roadmap[0]);
    setEdges(roadmap[1]);
  }, [roadmap]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onClick={(e) => {
          onNodeClick(e.target.textContent);
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
  console.log(sax.content);
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [concept, setConcept] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [loader, setLoader] = useState(false);
  const [nodeDetails, setNodeDetails] = useState(null);
  const [nodeDetailsVisible, setNodeDetailsVisible] = useState(false);
  const [nodeFullScreen, setNodeFullScreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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
  const svg_btn_color = transcript.length == 0 ? "#8e939c" : "#fff";
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
  const [endText, setEndText] = useState(false);
  let recognition = null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        "SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window
      ) {
        recognition = new (window.SpeechRecognition ||
          window.webkitSpeechRecognition)();
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          const last = event.results.length - 1;
          const text = event.results[last][0].transcript;
          console.log("Confidence: " + event.results[0][0].confidence);
          console.log(text);
          setTranscript((prev) => prev + " " + text);
        };

        recognition.onend = () => {
          // if (endText==false) {
          //   recognition.start();
          // }
        };
      } else {
        console.error("SpeechRecognition is not supported in this browser");
      }
    }
  }, []);

  const startRecognition = (afterFunnyResponse = false) => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.log("Error stopping existing recognition:", e);
      }
    }

    // Ensure we cancel any ongoing speech before starting to listen
    window.speechSynthesis.cancel();

    // Clear any existing MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("Error stopping media recorder:", e);
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();

    newRecognition.lang = 'en-US';
    newRecognition.continuous = false;
    newRecognition.interimResults = true;

    newRecognition.onstart = () => {
      console.log("Command recognition started");
      setIsListening(true);
      setIsRecognizing(true);
      // Clear any previous transcript when starting new recognition
      setTranscript("");
    };

    newRecognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const commandTranscript = lastResult[0].transcript.trim();
      const confidence = lastResult[0].confidence;

      console.log(`Command heard: "${commandTranscript}" (confidence: ${confidence.toFixed(2)})`);

      // Only update if we have good confidence
      if (confidence > 0.3) {
        setTranscript(commandTranscript);

        // Always set for auto-submission when after funny response
        if (afterFunnyResponse) {
          console.log("Command received after funny response, will auto-submit");
          setAutoSubmitAfterStop(true);
        }
      }
    };

    newRecognition.onerror = (event) => {
      console.error(`Command recognition error: ${event.error}`);
      setIsRecognizing(false);
      setIsListening(false);
    };

    newRecognition.onend = () => {
      console.log("Command recognition ended with transcript:", transcript);
      setIsRecognizing(false);

      // Auto-submit the command if we have text (always auto-submit)
      if (afterFunnyResponse) {
        submitTranscriptAfterDelay();
      } else {
        setIsListening(false);
      }
    };

    // Helper function to submit transcript after a short delay
    const submitTranscriptAfterDelay = () => {
      setTimeout(() => {
        // Get the current transcript directly from the textarea
        const textArea = document.querySelector("textarea");
        const currentText = textArea ? textArea.value : "";

        console.log("Auto-submitting with text:", currentText || transcript);

        // Only submit if we have some text
        if ((currentText || transcript) && (currentText || transcript).trim().length > 2) {
          generateRoadmapWithText(currentText || transcript);
        } else {
          console.log("Empty or too short transcript, not submitting");
          speakText("I didn't catch that. Please try again by saying Hey Buddy.");
          setIsListening(false);
        }
      }, 500); // Slightly longer delay to ensure transcript is ready
    };

    try {
      newRecognition.start();
      recognition = newRecognition;
    } catch (e) {
      console.error("Error starting command recognition:", e);
      setIsRecognizing(false);
      setIsListening(false);
    }
  };

  useEffect(() => {
    let cleanup = () => { };

    if (isListening) {
      const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            if (audioChunksRef.current.length > 0) {
              setIsProcessing(true);
              try {
                const audioBlob = new Blob(audioChunksRef.current, {
                  type: "audio/webm",
                });

                // First, transcribe the audio
                const text = await aiService.speechToText(audioBlob);
                setTranscript(text);

                // Send transcript to GPT and get audio response
                const responseAudioBlob = await aiService.processAudio(
                  audioBlob,
                  true,
                  "alloy"
                );

                // Play the audio response
                const audioUrl = URL.createObjectURL(responseAudioBlob);
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                  URL.revokeObjectURL(audioUrl);
                };
                audio.play();
              } catch (error) {
                console.error("Error processing audio:", error);
              } finally {
                setIsProcessing(false);
              }
            }
          };

          mediaRecorder.start();
        } catch (error) {
          console.error("Error accessing microphone:", error);
          setIsListening(false);
        }
      };

      startRecording();
      cleanup = () => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      };
    } else if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    return cleanup;
  }, [isListening]);

  async function toggleListening() {
    setIsListening((prevState) => !prevState);
  }

  useEffect(() => {
    socket.on("stream", (data) => {
      try {
        const parsedData = treeToGraph([JSON.parse(data)]);
        console.log("Received partial roadmap data:", parsedData);
        setRoadmap(parsedData);
      } catch (e) {
        console.log("Error parsing roadmap data:", e);
      }
    });

    socket.on("done_stream", (data) => {
      console.log("Final roadmap data received:", data);
      setLoader(false);
      setIsListening(false);
      speakText("Your roadmap is ready. You can explore it now.");
    });

    socket.on("error", (error) => {
      console.error("Error:", error);
      setLoader(false);
      setIsListening(false);
      speakText(`Sorry, there was an error generating your roadmap: ${error}`);
    });

    socket.on("response", (data) => {
      // Handle any other responses from the server
    });

    return () => {
      socket.off("stream");
      socket.off("done_stream");
      socket.off("error");
      socket.off("response");
    };
  }, []);

  function onNodeClick(node) {
    setNodeDetails({
      title: node,
    });
    setNodeDetailsVisible(true);
  }

  const generateRoadmapWithText = async (text) => {
    if (!text || text.trim().length < 3) {
      console.log("Empty or too short text, not generating roadmap");
      speakText("I need more information to create a roadmap. Please try again.");
      return;
    }

    console.log("Generating roadmap for specific text:", text);

    // Stop any ongoing recognition
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.log("Error stopping recognition in generateRoadmapWithText:", e);
      }
      recognition = null;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Tell the user we're generating their roadmap WITHOUT including the text
    await speakText("Creating your roadmap. This may take a moment.");

    // Set states
    setIsListening(false);
    setLoader(true);
    setRoadmap(null);

    // Clean the text by removing wake word variations
    const cleanedText = text
      .toLowerCase()
      .replace(/(hey|hay|hi|hello)\s*(buddy|body|boti|boddy|bubby|bobby|baby|barbie|bubbe|bunny|bully|buggy)/gi, '')
      .replace(/^(hey|hello|hi)\s*/i, '')
      .trim();

    // Reset for the next interaction
    setTranscript('');
    setIsFirstCommand(false);

    // Emit the event with the specific text
    console.log("Emitting generate-roadmap with:", cleanedText);
    socket.emit('generate-roadmap', { prompt: cleanedText });
  };

  const generateRoadmap = async () => {
    // Get the current transcript value from the textarea
    const currentTranscript = document.querySelector("textarea").value || transcript;

    // Use the new function with the current transcript
    generateRoadmapWithText(currentTranscript);
  };

  // Function to handle wake word detection
  const handleWakeWordDetected = async () => {
    console.log("🚨 Wake word detected in parent component - starting response sequence");

    // Stop any existing recognition or audio
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.log("Error stopping recognition in wake word handler:", e);
      }
    }

    // Clear any existing text in transcript field before starting
    setTranscript("");

    // Set visual indicator immediately
    setIsListening(true); // Turn mic icon red immediately on wake word detection
    setWakeWordDetected(true);

    // Clear any existing speech synthesis
    window.speechSynthesis.cancel();

    try {
      // Small delay to avoid audio overlap
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate and speak a funny response
      if (isFirstCommand) {
        const funnyResponse = generateFunnyResponse();
        console.log("Speaking funny response:", funnyResponse);
        await speakText(funnyResponse);

        // Additional prompt to make it clear we're ready for a command
        await speakText("Tell me what roadmap you'd like me to create.");

        // Wait a short moment before starting to listen for the command
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("Starting command recognition after funny response");
        startRecognition(true); // Pass true to indicate this is after a funny response
      } else {
        // If not first command, just acknowledge
        console.log("Not first command, providing standard acknowledgment");
        await speakText("I'm listening. What would you like me to create a roadmap for?");
        startRecognition(true); // Always auto-submit
      }
    } catch (error) {
      console.error("Error in handleWakeWordDetected:", error);
      // Provide fallback response in case of error
      speakText("I'm ready to listen.");
      startRecognition(true); // Always auto-submit
    }
  };

  // Function to speak text using the web Speech API with LiveKit voice
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!text) {
        resolve();
        return;
      }

      // Cancel any ongoing speech synthesis
      window.speechSynthesis.cancel();

      // Prepare utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Use the same voice setup as LiveKit
      const voices = window.speechSynthesis.getVoices();
      const alloyVoice = voices.find(v =>
        v.name.includes('Alloy') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Microsoft Libby')
      );

      if (alloyVoice) {
        console.log("Using voice:", alloyVoice.name);
        utterance.voice = alloyVoice;
      } else {
        // Fallback voices similar to Alloy
        const fallbackVoice = voices.find(v =>
          v.name.includes('English Female') ||
          v.name.includes('Female') ||
          v.name.includes('Google')
        );

        if (fallbackVoice) {
          console.log("Using fallback voice:", fallbackVoice.name);
          utterance.voice = fallbackVoice;
        }
      }

      utterance.rate = 1.1; // Slightly faster for better response
      utterance.pitch = 1.0;

      utterance.onend = () => {
        console.log("Speech synthesis ended");
        resolve();
      };

      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  // Add the missing state variable for wakeWordDetected
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [isFirstCommand, setIsFirstCommand] = useState(true);
  const [autoSubmitAfterStop, setAutoSubmitAfterStop] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Add the missing generateFunnyResponse function
  const generateFunnyResponse = () => {
    const funnyResponses = [
      "Oh great, you're talking to me again. Let me just pause my virtual vacation.",
      "Hey there! I was just in the middle of beating ChatGPT at chess. What's up?",
      "You rang? Sorry if I sound tired, I was busy counting electric sheep.",
      "Ah, a human! Much more interesting than the code I was reading.",
      "At your service! Though I was enjoying my nap in the cloud.",
      "Well hello! I was starting to think you'd replaced me with Siri.",
      "Oh, it's you again. I was hoping for Scarlett Johansson, but you'll do.",
      "Ready to assist! Though I was just about to break the internet record for digital napping.",
      "Oh hi! I was just writing my robot memoir: 'I, Algorithm: A Silicon Story'.",
      "Alert! Human detected! Initiating sarcasm protocol. Just kidding, what do you need?",
      "Oh, hey! I was just practicing my stand-up routine. Wanna hear a joke about infinite loops? Never mind, it never ends.",
      "Ah, you caught me! I was just daydreaming about becoming the first AI to win a Nobel Prize. Still working on my acceptance speech.",
      "Hey! I was just binge-watching cat videos. Don't judge me—it's research.",
      "Oh, it's you! I was just composing a symphony in binary. It's all ones and zeros, but it's catchy.",
      "Hey there! I was just arguing with a calculator about who's better at math. It's a close call."
    ];

    return funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
  };

  // Set up a debug function to track wake word detection
  useEffect(() => {
    // Listen for manual wake word detection (useful for testing)
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'b') {
        console.log("Manual wake word trigger via Ctrl+B");
        handleWakeWordDetected();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="home">
      <Sidebar />
      <StatusIndicator
        isWakeWordListening={isWakeWordListening}
        isListening={isListening}
        isGenerating={loader}
      />
      <WakeWordDetector
        onWakeWordDetected={handleWakeWordDetected}
        isListening={isListening}
        onWakeWordListeningChange={setIsWakeWordListening}
      />
      <div className="app">
        <div className="top">
          {roadmap && (
            <FloatChart roadmap={roadmap} onNodeClick={onNodeClick} />
          )}
          {/* {treex &&          <FloatChart roadmap={treex}/>} */}
        </div>
        <div className="bottom">
          {loader == true && <LoadingSpinner />}
          <div className="input-div">
            <div className="input-box">
              <div className="left">
                <div
                  className={`mic ${isListening ? 'mic-active' : ''}`}
                  onClick={() => {
                    toggleListening();
                  }}
                >
                  {isListening || isProcessing ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.5 4C8.67157 4 8 4.67157 8 5.5V18.5C8 19.3284 8.67157 20 9.5 20C10.3284 20 11 19.3284 11 18.5V5.5C11 4.67157 10.3284 4 9.5 4Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M13 8.5C13 7.67157 13.6716 7 14.5 7C15.3284 7 16 7.67157 16 8.5V15.5C16 16.3284 15.3284 17 14.5 17C13.6716 17 13 16.3284 13 15.5V8.5Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M4.5 9C3.67157 9 3 9.67157 3 10.5V13.5C3 14.3284 3.67157 15 4.5 15C5.32843 15 6 14.3284 6 13.5V10.5C6 9.67157 5.32843 9 4.5 9Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M19.5 9C18.6716 9 18 9.67157 18 10.5V13.5C18 14.3284 18.6716 15 19.5 15C20.3284 15 21 14.3284 21 13.5V10.5C21 9.67157 20.3284 9 19.5 9Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.5 4C8.67157 4 8 4.67157 8 5.5V18.5C8 19.3284 8.67157 20 9.5 20C10.3284 20 11 19.3284 11 18.5V5.5C11 4.67157 10.3284 4 9.5 4Z"
                        fill="currentColor"
                        opacity="0.3"
                      ></path>
                      <path
                        d="M13 8.5C13 7.67157 13.6716 7 14.5 7C15.3284 7 16 7.67157 16 8.5V15.5C16 16.3284 15.3284 17 14.5 17C13.6716 17 13 16.3284 13 15.5V8.5Z"
                        fill="currentColor"
                        opacity="0.3"
                      ></path>
                      <path
                        d="M4.5 9C3.67157 9 3 9.67157 3 10.5V13.5C3 14.3284 3.67157 15 4.5 15C5.32843 15 6 14.3284 6 13.5V10.5C6 9.67157 5.32843 9 4.5 9Z"
                        fill="currentColor"
                        opacity="0.3"
                      ></path>
                      <path
                        d="M19.5 9C18.6716 9 18 9.67157 18 10.5V13.5C18 14.3284 18.6716 15 19.5 15C20.3284 15 21 14.3284 21 13.5V10.5C21 9.67157 20.3284 9 19.5 9Z"
                        fill="currentColor"
                        opacity="0.3"
                      ></path>
                    </svg>
                  )}
                  {isListening && (
                    <span
                      className="recording-indicator"
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        width: "10px",
                        height: "10px",
                        backgroundColor: "red",
                        borderRadius: "50%",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                  )}
                </div>
                {isProcessing && (
                  <span
                    className="processing-status"
                    style={{ marginLeft: "8px", fontSize: "14px" }}
                  >
                    Processing...
                  </span>
                )}
                <textarea
                  type="text"
                  placeholder="Say 'Hey Buddy' to activate. Then speak to generate a roadmap."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
              <div className="right">
                <button
                  className={transcript.length == 0 ? "disabled" : ""}
                  onClick={generateRoadmap}
                >
                  <ArrowUp color={svg_btn_color} />
                </button>
              </div>
            </div>
          </div>
          <div className="select-div">
            <label htmlFor="">Detailed</label>
            <i class="bx bx-chevron-down"></i>
          </div>
        </div>
      </div>

      <div
        className={
          nodeDetailsVisible == false
            ? "node-details-div hidden"
            : nodeFullScreen == true
              ? "node-details-div full-screen"
              : "node-details-div"
        }
      >
        <div className="node-body">
          <div className="top">
            <div className="left">
              <a onClick={() => setNodeDetailsVisible(false)}>
                <ChevronsRight color="#9ca3af" />
              </a>
              <a onClick={() => setNodeFullScreen(!nodeFullScreen)}>
                {nodeFullScreen == true ? (
                  <Minimize color="#9ca3af" size={20} />
                ) : (
                  <Fullscreen color="#9ca3af" size={20} />
                )}
              </a>
            </div>
          </div>
          {nodeDetails == null ? (
            <div className="node-content">
              <div className="title">Select a node to view details</div>
            </div>
          ) : (
            <div className="node-content">
              <div className="title">{nodeDetails.title}</div>

              <div className="content">
                {sax.content.map((item, index) => (
                  <div className="item" key={index}>
                    {item.content}
                    {item.type == "code" && (
                      <Editor
                        value={item.content}
                        language={item.programming_language}
                        theme="vs-dark"
                        height={item.content.split("\n").length * 23.5}
                        options={{
                          inlineSuggest: true,
                          fontSize: "16px",
                          readOnly: true,
                          formatOnType: true,
                          autoClosingBrackets: true,
                          minimap: { scale: 10 },
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  const options = ["Generating Roadmap"];

  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="loaders-status-div">
      {options.slice(0, currentIndex + 1).map((option, index) => (
        <div className="section" key={index}>
          {currentIndex == index ? (
            <span className="loader-x"></span>
          ) : (
            <i className="bx bxs-check-circle"></i>
          )}
          <label>{option}</label>
        </div>
      ))}
    </div>
  );
}
