"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import "./styles/home.scss";
import Sidebar from "./components/Sidebar";

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

  const startRecognition = () => {
    if (recognition) {
      recognition.start();
    }
  };

  const stopRecognition = () => {
    if (recognition) {
      setEndText(true);
      recognition.stop();
    }
  };

  useEffect(() => {
    let cleanup = () => {};

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
        setRoadmap(treeToGraph([JSON.parse(data)]));
      } catch (e) {
        console.log(e);
      }
    });
    socket.on("done_stream", (data) => {
      console.log("final_data", roadmap);
      setLoader(false);
    });
    socket.on("error", (error) => {
      console.error("Error:", error);
    });

    socket.on("response", (data) => {});

    return () => {
      socket.off("stream");
      socket.off("error");
    };
  }, []);

  function onNodeClick(node) {
    setNodeDetails({
      title: node,
    });
    setNodeDetailsVisible(true);
  }

  const generateRoadmap = () => {
    // socket.emit("message",transcript)
    setLoader(true);
    setRoadmap([]);
    socket.emit("generate-roadmap", transcript);

    setTranscript("");
  };

  return (
    <div className="home">
      <Sidebar />
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
                  className="mic"
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
                  placeholder="Generate a roadmap, learn anything."
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
