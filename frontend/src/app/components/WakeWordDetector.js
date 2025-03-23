import React, { useState, useEffect, useRef } from 'react';

const WakeWordDetector = ({ onWakeWordDetected, isListening, onWakeWordListeningChange }) => {
    const [isWakeWordListening, setIsWakeWordListening] = useState(false);
    const recognitionRef = useRef(null);
    const wakeWordTimeoutRef = useRef(null);
    const activeListeningRef = useRef(false);
    const [soundLoaded, setSoundLoaded] = useState(false);
    const notificationSoundRef = useRef(null);
    const intentionalAbortRef = useRef(false);

    // Pass isWakeWordListening state back to parent
    useEffect(() => {
        if (onWakeWordListeningChange) {
            onWakeWordListeningChange(isWakeWordListening);
        }
    }, [isWakeWordListening, onWakeWordListeningChange]);

    // Preload notification sound to prevent loading errors
    useEffect(() => {
        try {
            // Create and preload the audio element
            const audio = new Audio();

            // Set event listeners for successful and failed loading
            audio.addEventListener('canplaythrough', () => {
                console.log("Wake sound loaded successfully");
                setSoundLoaded(true);
            });

            audio.addEventListener('error', (e) => {
                console.error("Wake sound failed to load:", e);
                setSoundLoaded(false);
            });

            // Only set the source after adding the event listeners
            audio.src = '/wake-sound.mp3';

            // Store the audio element in a ref for later use
            notificationSoundRef.current = audio;

            // Attempt to load the audio
            audio.load();
        } catch (e) {
            console.error("Error setting up notification sound:", e);
            setSoundLoaded(false);
        }

        // Cleanup function
        return () => {
            if (notificationSoundRef.current) {
                notificationSoundRef.current.pause();
                notificationSoundRef.current = null;
            }
        };
    }, []);

    // Function to properly stop any existing recognition
    const stopRecognition = (intentional = true) => {
        console.log(`${intentional ? "Explicitly" : "Implicitly"} stopping wake word recognition`);

        // Set the intentional abort flag if this is an intentional stop
        intentionalAbortRef.current = intentional;

        if (recognitionRef.current) {
            try {
                // Check if recognition is active before stopping
                if (recognitionRef.current.state === 'running') {
                    recognitionRef.current.stop();
                } else {
                    console.log("Recognition already stopped");
                }
            } catch (e) {
                console.log("Error stopping recognition", e);
            }
            // Clear the reference to ensure fresh start
            recognitionRef.current = null;
        }

        // Clear any pending restarts
        if (wakeWordTimeoutRef.current) {
            clearTimeout(wakeWordTimeoutRef.current);
            wakeWordTimeoutRef.current = null;
        }

        // Reset listening state
        activeListeningRef.current = false;
        setIsWakeWordListening(false);
    };

    // Set up and start the wake word detection
    useEffect(() => {
        // Only initialize if SpeechRecognition is available
        if (typeof window !== 'undefined' &&
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {

            console.log("Initializing wake word detector...");

            // Clean up function to stop recognition and clear timeout
            const cleanup = () => {
                console.log("Cleaning up wake word detector");
                stopRecognition(true);
            };

            // Start wake word detection if not currently listening to a command
            const startWakeWordDetection = () => {
                // Don't start if already listening for commands
                if (isListening) {
                    console.log("Not starting wake word detection because already listening for commands");
                    return;
                }

                // Don't start if already actively listening for wake word
                if (activeListeningRef.current || recognitionRef.current) {
                    console.log("Already listening for wake word");
                    return;
                }

                console.log("Starting wake word detection...");
                activeListeningRef.current = true;
                setIsWakeWordListening(true);

                // Reset the intentional abort flag
                intentionalAbortRef.current = false;

                // Create a new recognition instance
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognitionRef.current = recognition;

                // Configure recognition
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = true; // Get interim results to catch more attempts
                recognition.maxAlternatives = 5; // Increase max alternatives to 5 for better matching

                // Set up event handlers
                recognition.onstart = () => {
                    console.log("Wake word detection started");
                    activeListeningRef.current = true;
                    setIsWakeWordListening(true);
                };

                recognition.onresult = (event) => {
                    // Get the recognized speech
                    console.log(`Got speech result with ${event.results.length} results`);

                    for (let i = 0; i < event.results.length; i++) {
                        for (let j = 0; j < event.results[i].length; j++) {
                            const transcript = event.results[i][j].transcript.toLowerCase().trim();
                            const confidence = event.results[i][j].confidence;

                            // Only log and process results with reasonable confidence
                            if (confidence > 0.1) { // Lower threshold to catch more potential wake words
                                console.log(`Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

                                // Check if the transcript contains anything like "hey buddy" with very lenient matching
                                if (transcript.includes('buddy') ||
                                    transcript.includes('bud') ||
                                    transcript.includes('bubby') ||
                                    transcript.includes('hey') ||
                                    transcript.includes('hay') ||
                                    transcript.includes('hello') ||
                                    transcript.includes('body')) {

                                    console.log("⭐⭐⭐ POTENTIAL WAKE WORD: checking more carefully");

                                    // More specific check for wake word with variations for better detection
                                    if (
                                        // Full phrases with very lowered confidence threshold
                                        (transcript.includes('hey buddy') && confidence > 0.2) ||
                                        (transcript.includes('hay buddy') && confidence > 0.2) ||
                                        (transcript.includes('hey body') && confidence > 0.2) ||
                                        (transcript.includes('hey bud') && confidence > 0.2) ||
                                        (transcript.includes('hey budy') && confidence > 0.2) ||
                                        (transcript.includes('hey bodi') && confidence > 0.2) ||

                                        // Bubby variations with very low threshold
                                        (transcript.includes('hey bubby') && confidence > 0.15) ||
                                        (transcript.includes('hay bubby') && confidence > 0.15) ||
                                        (transcript.includes('hey bobby') && confidence > 0.15) ||
                                        (transcript.includes('hey baby') && confidence > 0.15) ||
                                        (transcript.includes('hay bobby') && confidence > 0.15) ||
                                        (transcript.includes('hey bobbi') && confidence > 0.15) ||

                                        // Exact matches with very low confidence requirements
                                        ((transcript === 'hey buddy' ||
                                            transcript === 'hay buddy' ||
                                            transcript === 'hey body' ||
                                            transcript === 'hey bud' ||
                                            transcript === 'hey bodies' ||
                                            transcript === 'a buddy' ||
                                            transcript === 'hey budy' ||
                                            transcript === 'hay budy' ||
                                            transcript === 'a body' ||
                                            transcript === 'hey botty' ||
                                            // Bubby exact matches
                                            transcript === 'hey bubby' ||
                                            transcript === 'hay bubby' ||
                                            transcript === 'hey bobby' ||
                                            transcript === 'hey baby' ||
                                            transcript === 'hey barbie' ||
                                            transcript === 'hey bubbe' ||
                                            transcript === 'a bubby' ||
                                            transcript === 'a bobby') && confidence > 0.1) ||

                                        // Just include keywords with very lenient matching
                                        (transcript.includes('buddy') && confidence > 0.3) ||
                                        (transcript.includes('bubby') && confidence > 0.25) ||
                                        (transcript.includes('bobby') && confidence > 0.25) ||

                                        // Sound-alike words
                                        (transcript.includes('hello buddy') && confidence > 0.2) ||
                                        (transcript.includes('hello bud') && confidence > 0.2) ||
                                        (transcript.includes('hi buddy') && confidence > 0.2) ||
                                        (transcript.includes('hi bud') && confidence > 0.2)
                                    ) {
                                        console.log("🎉🎉🎉 WAKE WORD DETECTED: Hey Buddy/Bubby! 🎉🎉🎉");
                                        console.log(`Detected "${transcript}" with confidence ${confidence.toFixed(2)}`);

                                        // Play notification sound if available
                                        if (soundLoaded && notificationSoundRef.current) {
                                            try {
                                                // Stop and reset the sound if it's already playing
                                                notificationSoundRef.current.pause();
                                                notificationSoundRef.current.currentTime = 0;

                                                // Play the sound
                                                notificationSoundRef.current.play().catch(e => {
                                                    console.log("Error playing notification sound:", e);
                                                });
                                            } catch (e) {
                                                console.log("Could not play notification sound", e);
                                            }
                                        } else {
                                            console.log("Notification sound not loaded, skipping sound");
                                        }

                                        // Stop the wake word detection
                                        stopRecognition(true);

                                        // Trigger the callback
                                        if (onWakeWordDetected) {
                                            console.log("🔊 Calling wake word detected callback");
                                            onWakeWordDetected();
                                        }

                                        return;
                                    }
                                }
                            } else if (j === 0) {
                                // Only log the first low confidence result to reduce noise
                                console.log(`Ignored low confidence result: "${transcript}" (${confidence.toFixed(2)})`);
                            }
                        }
                    }
                };

                recognition.onerror = (event) => {
                    console.error(`Wake word detection error: ${event.error}`);

                    // Reset the active listening state
                    activeListeningRef.current = false;
                    recognitionRef.current = null;

                    // If aborted intentionally, don't restart
                    if (event.error === 'aborted') {
                        console.log(`Wake word detection was aborted ${intentionalAbortRef.current ? 'intentionally' : 'by browser'}`);

                        // Only skip restart if it was our intentional abort
                        if (intentionalAbortRef.current) {
                            return;
                        } else {
                            console.log("Browser initiated abort - will restart");
                        }
                    }

                    // Handle specific errors differently
                    if (event.error === 'no-speech') {
                        console.log("No speech detected, this is normal - will restart");
                    } else if (event.error === 'network') {
                        console.error("Network error in speech recognition");
                    } else if (event.error === 'not-allowed') {
                        console.error("Speech recognition permission denied");
                        // Don't restart if permission was denied
                        return;
                    }

                    // Restart wake word detection after an error with increased delay for certain errors
                    const delay = (event.error === 'network') ? 3000 :
                        (event.error === 'aborted') ? 1500 : 1000;

                    console.log(`Will restart wake word detection in ${delay}ms`);
                    wakeWordTimeoutRef.current = setTimeout(() => {
                        console.log("Restarting wake word detection after error");
                        startWakeWordDetection();
                    }, delay);
                };

                recognition.onend = () => {
                    console.log("Wake word detection ended");

                    // Don't restart if we're now listening for commands
                    if (isListening) {
                        console.log("Not restarting wake word detection because now listening for commands");
                        activeListeningRef.current = false;
                        recognitionRef.current = null;
                        return;
                    }

                    // Don't restart if the component is unmounting or was stopped intentionally
                    if (!activeListeningRef.current || intentionalAbortRef.current) {
                        console.log(`Not restarting wake word detection because it was ${intentionalAbortRef.current ? 'intentionally stopped' : 'deactivated'}`);
                        recognitionRef.current = null;
                        return;
                    }

                    // Otherwise restart wake word detection after a short delay
                    console.log("Scheduling restart of wake word detection");
                    // Clear the reference to allow a clean restart
                    recognitionRef.current = null;
                    wakeWordTimeoutRef.current = setTimeout(() => {
                        console.log("Restarting wake word detection after end");
                        startWakeWordDetection();
                    }, 800); // Increased delay to avoid rapid restarts
                };

                // Start recognition
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Error starting wake word recognition:", e);
                    activeListeningRef.current = false;
                    recognitionRef.current = null;

                    // Try to restart after error
                    wakeWordTimeoutRef.current = setTimeout(() => {
                        console.log("Trying to restart wake word detection after start error");
                        startWakeWordDetection();
                    }, 1500); // Increased delay after start error
                }
            };

            // Start initial wake word detection
            startWakeWordDetection();

            // Clean up on unmount
            return cleanup;
        } else {
            console.error("SpeechRecognition is not supported in this browser");
        }
    }, [isListening, onWakeWordDetected]);

    // Update detection state when isListening changes
    useEffect(() => {
        if (isListening) {
            // Stop wake word detection while listening for commands
            console.log("Stopping wake word detection because now listening for commands");
            stopRecognition(true);
        } else {
            // Restart wake word detection when command listening ends
            console.log("Restarting wake word detection after command listening");
            // Add a short delay to allow any other recognition to finish
            wakeWordTimeoutRef.current = setTimeout(() => {
                // Only start if not already listening
                if (!activeListeningRef.current && !recognitionRef.current) {
                    // Create a new recognition instance
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    recognitionRef.current = recognition;

                    // Configure recognition
                    recognition.lang = 'en-US';
                    recognition.continuous = false;
                    recognition.interimResults = true;
                    recognition.maxAlternatives = 5;

                    // Reset intentional abort flag
                    intentionalAbortRef.current = false;

                    // Set up handlers (brief versions since the main handlers are in the main effect)
                    recognition.onstart = () => {
                        console.log("Wake word detection restarted after command");
                        activeListeningRef.current = true;
                        setIsWakeWordListening(true);
                    };

                    recognition.onerror = (event) => {
                        console.error("Restart recognition error:", event.error);
                        activeListeningRef.current = false;
                        recognitionRef.current = null;

                        // Specific handling for aborted errors during restart
                        if (event.error === 'aborted' && !intentionalAbortRef.current) {
                            console.log("Browser aborted restart - will try again");
                            wakeWordTimeoutRef.current = setTimeout(() => {
                                console.log("Attempting restart after browser abort");
                                if (!isListening && !activeListeningRef.current) {
                                    // Call the parent useEffect's startWakeWordDetection
                                    // This is a bit of a hack but should work
                                    document.dispatchEvent(new CustomEvent('restartWakeWordDetection'));
                                }
                            }, 1500);
                        }
                    };

                    recognition.onend = () => {
                        console.log("Restart recognition ended");
                        // Let the main effect handle the restart logic
                        if (activeListeningRef.current) {
                            activeListeningRef.current = false;
                            recognitionRef.current = null;
                        }
                    };

                    // Configure result handler
                    recognition.onresult = (event) => {
                        // Same as the main result handler, but simplified to avoid duplication
                        for (let i = 0; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript.toLowerCase().trim();
                            const confidence = event.results[i][0].confidence;

                            // Only process results with reasonable confidence
                            if (confidence > 0.2) {
                                console.log(`Restart heard: "${transcript}" (${confidence.toFixed(2)})`);

                                // Simple check for wake words
                                if (transcript.includes('hey buddy') || transcript.includes('hey bubby')) {
                                    console.log("🎉 Wake word detected in restart!");
                                    stopRecognition(true);
                                    if (onWakeWordDetected) onWakeWordDetected();
                                    return;
                                }
                            }
                        }
                    };

                    // Start recognition
                    try {
                        console.log("Starting wake word detection after command finished");
                        recognition.start();
                        activeListeningRef.current = true;
                        setIsWakeWordListening(true);
                    } catch (e) {
                        console.error("Error restarting wake word detection:", e);
                        // Reset state
                        stopRecognition(false);
                    }
                } else {
                    console.log("Not restarting - already active or recognizer exists");
                }
            }, 1000); // Increased delay to ensure everything is cleared
        }
    }, [isListening]);

    // Setup a custom event listener for restarts
    useEffect(() => {
        const handleRestart = () => {
            console.log("Handling restart event");
            if (!isListening && !activeListeningRef.current && !recognitionRef.current) {
                // Only start if not already started
                // Clear any existing timeout first
                if (wakeWordTimeoutRef.current) {
                    clearTimeout(wakeWordTimeoutRef.current);
                }

                // Create a new recognition instance
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognitionRef.current = recognition;

                // Configure recognition
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.maxAlternatives = 5;

                // Reset intentional abort flag
                intentionalAbortRef.current = false;

                // Set up basic handlers
                recognition.onstart = () => {
                    console.log("Event-triggered wake word detection started");
                    activeListeningRef.current = true;
                    setIsWakeWordListening(true);
                };

                recognition.onerror = (e) => {
                    console.error("Error in event-triggered recognition:", e);
                    activeListeningRef.current = false;
                    recognitionRef.current = null;
                };

                recognition.onend = () => {
                    if (activeListeningRef.current) {
                        activeListeningRef.current = false;
                        recognitionRef.current = null;
                    }
                };

                // Start listening
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Error starting event-triggered recognition:", e);
                    activeListeningRef.current = false;
                    recognitionRef.current = null;
                }
            }
        };

        // Add the event listener
        document.addEventListener('restartWakeWordDetection', handleRestart);

        // Cleanup
        return () => {
            document.removeEventListener('restartWakeWordDetection', handleRestart);
        };
    }, [isListening]);

    // Make sure the wake word detector starts immediately on mount
    useEffect(() => {
        console.log("WakeWordDetector mounted - ensuring wake word detection starts");
        if (typeof window !== 'undefined' &&
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {

            // Only start if not already started
            if (!activeListeningRef.current && !recognitionRef.current && !isListening) {
                // Clear any existing timeout first
                if (wakeWordTimeoutRef.current) {
                    clearTimeout(wakeWordTimeoutRef.current);
                }

                // Schedule the start with a delay to avoid conflicts
                wakeWordTimeoutRef.current = setTimeout(() => {
                    // Create a new recognition instance
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    recognitionRef.current = recognition;

                    // Configure recognition
                    recognition.lang = 'en-US';
                    recognition.continuous = false;
                    recognition.interimResults = true;
                    recognition.maxAlternatives = 5;

                    // Reset intentional abort flag
                    intentionalAbortRef.current = false;

                    // Only setup minimal handlers - the main effect will handle the rest
                    recognition.onstart = () => {
                        console.log("Initial wake word detection started on mount");
                        activeListeningRef.current = true;
                        setIsWakeWordListening(true);
                    };

                    recognition.onerror = (e) => {
                        console.error("Error in initial wake word detection:", e);
                        activeListeningRef.current = false;
                        recognitionRef.current = null;
                    };

                    // Start listening for wake word
                    try {
                        console.log("Explicitly starting wake word detection on mount");
                        recognition.start();
                    } catch (e) {
                        console.error("Error starting wake word detection on mount:", e);
                        activeListeningRef.current = false;
                        recognitionRef.current = null;
                    }
                }, 700); // Increased delay for mount initialization
            }
        }

        // Cleanup this effect's timeout
        return () => {
            if (wakeWordTimeoutRef.current) {
                clearTimeout(wakeWordTimeoutRef.current);
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    // This component doesn't render anything visible
    return null;
};

export default WakeWordDetector; 