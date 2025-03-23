"use client";
import { useEffect, useRef, useState } from 'react';

const WakeWordDetector = ({ onWakeWordDetected, isListening, onWakeWordListeningChange }) => {
  const recognitionRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    // Don't activate wake word detection if we're already listening to commands
    if (isListening) {
      stopWakeWordDetection();
      return;
    }

    // Start wake word detection when component mounts
    startWakeWordDetection();

    return () => {
      stopWakeWordDetection();
    };
  }, [isListening]);

  const startWakeWordDetection = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Stop any existing recognition session
      if (recognitionRef.current) {
        stopWakeWordDetection();
      }

      // Create a new recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Handle results
      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim().toLowerCase();
        
        // Check for wake words - use various forms people might say
        const wakeWordVariants = [
          'hey buddy', 'hi buddy', 'hey body', 'hey boti', 
          'hey boddy', 'hey bubby', 'hey bobby', 'hey baby',
          'hay buddy', 'hello buddy'
        ];
        
        const hasWakeWord = wakeWordVariants.some(phrase => transcript.includes(phrase));
        
        if (hasWakeWord) {
          console.log(`🔊 Wake word detected: "${transcript}"`);
          
          // Stop listening for wake word
          stopWakeWordDetection();
          
          // Trigger the callback
          if (onWakeWordDetected) {
            onWakeWordDetected();
          }
        }
      };

      // Handle errors
      recognition.onerror = (event) => {
        console.error('Wake word detection error:', event.error);
        
        // Auto-restart on error (except when denied by user)
        if (event.error !== 'not-allowed' && !isListening) {
          setTimeout(() => {
            if (!isListening && !isDetecting) {
              startWakeWordDetection();
            }
          }, 3000);
        }
      };

      // Handle end of recognition
      recognition.onend = () => {
        // Auto-restart if not deliberately stopped and not in listening mode
        if (!isListening && isDetecting) {
          console.log('Restarting wake word detection...');
          setTimeout(() => {
            startWakeWordDetection();
          }, 500);
        }
      };

      // Start recognition
      recognition.start();
      setIsDetecting(true);
      if (onWakeWordListeningChange) {
        onWakeWordListeningChange(true);
      }
      
      console.log('Wake word detection started');
    } catch (error) {
      console.error('Error starting wake word detection:', error);
    }
  };

  const stopWakeWordDetection = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Wake word detection stopped');
      } catch (error) {
        console.error('Error stopping wake word detection:', error);
      }
      recognitionRef.current = null;
    }
    
    setIsDetecting(false);
    if (onWakeWordListeningChange) {
      onWakeWordListeningChange(false);
    }
  };

  return null; // This component has no UI
};

export default WakeWordDetector; 