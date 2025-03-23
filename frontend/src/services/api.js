const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiService = {
  // Send a message to the GPT endpoint
  async sendMessage(message) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/speech/gpt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Convert text to speech
  async textToSpeech(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/speech/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error converting text to speech:", error);
      throw error;
    }
  },

  // Process audio and convert to text
  async processAudio(audioBlob) {
    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        console.error("Cannot process empty audio file");
        throw new Error(
          "No audio data captured. Please try again and speak into the microphone."
        );
      }

      console.log(
        `Processing audio file: ${audioBlob.size} bytes, type: ${audioBlob.type}`
      );

      const formData = new FormData();

      // Get the mime type from the blob and determine the appropriate extension
      const mimeType = audioBlob.type;
      let extension = "webm"; // Default extension

      if (mimeType) {
        if (mimeType.includes("ogg")) extension = "ogg";
        else if (mimeType.includes("mp3")) extension = "mp3";
        else if (mimeType.includes("wav")) extension = "wav";
        // Don't use opus extension even if codec is opus, use webm instead
        else if (mimeType.includes("webm")) extension = "webm";
      }

      console.log(`Audio format: ${mimeType}, using extension: ${extension}`);

      // Append file with the appropriate extension - always use webm for opus codec
      if (mimeType.includes("opus")) {
        formData.append("file", audioBlob, "recording.webm");
      } else {
        formData.append("file", audioBlob, `recording.${extension}`);
      }

      const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error processing audio:", error);
      throw error;
    }
  },

  // Generate a roadmap
  async generateRoadmap(prompt) {
    try {
      // For now, use the GPT endpoint for roadmap generation
      const response = await fetch(`${API_BASE_URL}/api/speech/gpt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `Generate a detailed roadmap for: ${prompt}. Format it as a hierarchical JSON tree structure.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error generating roadmap:", error);
      throw error;
    }
  },

  // Get token information
  async getTokenInfo() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/info`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting token info:", error);
      throw error;
    }
  },
};
