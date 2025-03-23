"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import "./styles/home.scss";
import Sidebar from "./components/Sidebar";
import ReactMarkdown from "react-markdown";

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
  X,
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
        onNodeClick={(event, node) => {
          onNodeClick(node.data.label);
        }}
        layoutOptions={{
          orientation: "horizontal",
        }}
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
  const modalOverlayRef = useRef(null);
  const feedbackAudioRef = useRef(null);
  const [nodeContent, setNodeContent] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [lastSearchedConcept, setLastSearchedConcept] = useState("");

  // Initialize the feedback audio on component mount
  useEffect(() => {
    // Add event listeners to help diagnose issues
    if (feedbackAudioRef.current) {
      feedbackAudioRef.current.addEventListener("error", (e) => {
        console.error("Audio error:", e);
        if (feedbackAudioRef.current.error) {
          console.error(
            "Audio error code:",
            feedbackAudioRef.current.error.code
          );
          console.error(
            "Audio error message:",
            feedbackAudioRef.current.error.message
          );
        }
      });
    }
  }, []);
  
  const svg_btn_color = transcript.length == 0 ? "#8e939c" : "#fff";
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
    // Play the feedback sound
    if (feedbackAudioRef.current) {
      try {
        // Reset the audio to start from the beginning if it was played before
        feedbackAudioRef.current.currentTime = 0;

        // Play the sound with user interaction (which is required by browsers)
        const playPromise = feedbackAudioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.error("Detailed audio playback error:", err);
          });
        }
      } catch (err) {
        console.error("Error playing feedback sound:", err);
      }
    }

    // Toggle listening state
    setIsListening((prevState) => !prevState);
  }

  useEffect(() => {
    socket.on("stream", (data) => {
      try {
        // Parse the data and convert to graph format
        const parsedData = JSON.parse(data);
        const graphData = treeToGraph([parsedData]);

        // Update the roadmap state
        setRoadmap(graphData);

        // Close any open node details panel when a new roadmap is generated
        setNodeDetailsVisible(false);
        setNodeDetails(null);
      } catch (e) {
        console.log("Error parsing roadmap data:", e);
      }
    });

    socket.on("done_stream", (data) => {
      console.log("Roadmap generation complete");
      setLoader(false);
    });

    socket.on("error", (error) => {
      console.error("Error generating roadmap:", error);
      setLoader(false);
    });

    return () => {
      socket.off("stream");
      socket.off("done_stream");
      socket.off("error");
    };
  }, []);

  function onNodeClick(node) {
    setNodeDetails({
      title: node,
    });
    setIsContentLoading(true);
    
    // Show modal overlay first
    if (modalOverlayRef.current) {
      modalOverlayRef.current.classList.add("visible");
    }
    
    // Set node details visible immediately for smooth slide-in
    setNodeDetailsVisible(true);

    // Fetch content for the clicked node
    fetch("http://localhost:4555/node-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeName: node,
        concept: lastSearchedConcept,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Process the content to add more randomization and formatting
        let content = Array.isArray(data.content) ? data.content : [];

        // Process the content to enhance formatting
        content = processContentFormatting(content);

        setNodeContent(content);
        setIsContentLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching node content:", error);
        setIsContentLoading(false);
        // Fallback to static content if error
        setNodeContent(sax.content || []);
      });
  }

  const closeNodeDetails = () => {
    // First set the node details to hidden state to trigger slide-out
    setNodeDetailsVisible(false);
    
    // Then remove the modal overlay after a delay that matches the transition duration
    setTimeout(() => {
      if (modalOverlayRef.current) {
        modalOverlayRef.current.classList.remove("visible");
      }
    }, 350);
  };

  // Helper function to process content for better formatting and randomization
  function processContentFormatting(content) {
    if (!content || content.length === 0) return [];

    // Separate content by type
    const textItems = content.filter((item) => item.type === "text");
    const codeItems = content.filter((item) => item.type === "code");
    const mediaItems = content.filter(
      (item) => item.type === "image" || item.type === "video"
    );

    // Don't process if there's not enough content to randomize
    if (textItems.length <= 2 || mediaItems.length === 0) return content;

    // Find the main introductory text (usually the first text item)
    const introText = textItems.find(
      (item) =>
        item.content.startsWith("# ") ||
        item.content.startsWith("<h1>") ||
        textItems.indexOf(item) === 0
    );

    // Reserve section headers (items with ## or <h2>)
    const sectionHeaders = textItems.filter(
      (item) =>
        (item.content.includes("## ") || item.content.includes("<h2>")) &&
        item !== introText
    );

    // Regular text paragraphs (not intro, not headers)
    const paragraphs = textItems.filter(
      (item) => item !== introText && !sectionHeaders.includes(item)
    );

    // Create a new array with intro text first
    let processedContent = [];
    if (introText) {
      processedContent.push(introText);
    }

    // For each section header, add it and then mix content after it
    sectionHeaders.forEach((header) => {
      processedContent.push(header);

      // Get some paragraphs and media items for this section
      const sectionParagraphs = paragraphs.splice(
        0,
        Math.min(2, paragraphs.length)
      );
      const sectionMedia = mediaItems.splice(0, Math.min(1, mediaItems.length));

      // Add paragraphs and media items in alternating order
      const sectionItems = [...sectionParagraphs, ...sectionMedia].sort(
        () => Math.random() - 0.5
      );
      processedContent.push(...sectionItems);
    });

    // Add any remaining paragraphs and media items
    const remainingItems = [...paragraphs, ...mediaItems, ...codeItems].sort(
      () => Math.random() - 0.5
    );
    processedContent.push(...remainingItems);

    return processedContent;
  }

  const generateRoadmap = () => {
    // Clear the existing roadmap first
    setRoadmap(null);

    // Store the concept for later use with node content
    setLastSearchedConcept(transcript);

    // Show loading indicator
    setLoader(true);

    // Close any open node details
    setNodeDetailsVisible(false);
    setNodeDetails(null);

    // Request new roadmap
    socket.emit("generate-roadmap", transcript);
    setTranscript("");
  };

  const clearEverything = () => {
    setRoadmap(null);
    closeNodeDetails();
    setTranscript("");
    setLoader(false);
    setNodeContent([]);
    setLastSearchedConcept("");
  };

  return (
    <div className="home">
      <Sidebar />
      <div className="app">
        <audio
          ref={feedbackAudioRef}
          src="/sounds/mic-activation.wav"
          preload="auto"
        />
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
        </div>
      </div>

      <div
        ref={modalOverlayRef}
        className="modal-overlay"
        onClick={closeNodeDetails}
      ></div>

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
              <a
                onClick={closeNodeDetails}
              >
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
                {isContentLoading ? (
                  <div className="skeleton-loader">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-paragraph"></div>
                    <div className="skeleton-paragraph short"></div>
                    <div className="skeleton-paragraph"></div>
                    <div className="skeleton-paragraph very-short"></div>
                    <div className="skeleton-image"></div>
                    <div className="skeleton-paragraph"></div>
                    <div className="skeleton-paragraph short"></div>
                    <div className="skeleton-paragraph"></div>
                    <div className="skeleton-code"></div>
                    <div className="skeleton-paragraph short"></div>
                    <div className="skeleton-paragraph very-short"></div>
                  </div>
                ) : (
                  (nodeContent || []).map((item, index) => (
                    <div className="item" key={index}>
                      {item.type === "text" && (
                        <div>
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>
                      )}
                      {item.type === "code" && (
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
                      {item.type === "image" && (
                        <div className="image-container">
                          <img
                            key={`img-${index}-${item.extension || "unknown"}`}
                            src={item.content}
                            alt={item.title || "Related content"}
                            crossOrigin="anonymous"
                            onLoad={() =>
                              console.log(
                                "Image loaded successfully:",
                                item.content
                              )
                            }
                            onError={(e) => {
                              console.log(
                                "Image failed to load:",
                                item.content
                              );
                              console.log("Image extension:", item.extension);

                              // For JPG/JPEG files, try a special approach
                              if (
                                item.extension === "jpg" ||
                                item.extension === "jpeg" ||
                                (item.originalUrl &&
                                  (item.originalUrl
                                    .toLowerCase()
                                    .endsWith(".jpg") ||
                                    item.originalUrl
                                      .toLowerCase()
                                      .endsWith(".jpeg")))
                              ) {
                                console.log(
                                  "Trying direct fetch for JPG image"
                                );
                                // Create a direct image URL without the proxy
                                const directImageUrl = item.originalUrl;
                                e.target.src = directImageUrl;
                                e.target.setAttribute(
                                  "data-tried-direct",
                                  "true"
                                );
                                return;
                              }

                              // Try original URL if proxy fails
                              if (
                                item.originalUrl &&
                                !e.target.getAttribute("data-tried-original")
                              ) {
                                console.log(
                                  "Trying original URL:",
                                  item.originalUrl
                                );
                                e.target.setAttribute(
                                  "data-tried-original",
                                  "true"
                                );
                                e.target.src = item.originalUrl;
                              }
                              // If original URL also fails or isn't available, use placeholder
                              else if (
                                !e.target.getAttribute("data-using-fallback")
                              ) {
                                console.log("Using fallback placeholder image");
                                e.target.setAttribute(
                                  "data-using-fallback",
                                  "true"
                                );
                                e.target.src =
                                  "https://via.placeholder.com/600x400?text=Image+Unavailable";
                                e.target.style.opacity = "0.7";
                              }
                            }}
                            style={{
                              maxWidth: "100%",
                              height: "auto",
                              display: "block",
                              margin: "0 auto",
                            }}
                          />
                          {item.title && (
                            <div className="image-caption">{item.title}</div>
                          )}
                        </div>
                      )}
                      {item.type === "video" && (
                        <div className="video-container">
                          {item.content && (
                            <>
                              <iframe
                                src={item.content}
                                title={item.title || "Video content"}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                              {item.title && (
                                <div className="video-caption">
                                  {item.title}
                                </div>
                              )}
                            </>
                          )}
                          {!item.content && (
                            <div className="video-error">
                              Video content unavailable
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
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
