import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

/**
 * Service for interacting with the OpenAI backend
 */
class AIService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Send a text message to GPT and get a response
   * @param {string} text - The text to send to GPT
   * @returns {Promise<string>} The response from GPT
   */
  async sendTextMessage(text) {
    try {
      const response = await this.api.post("/api/speech/gpt", { text });
      return response.data.response;
    } catch (error) {
      console.error("Error sending text to GPT:", error);
      throw error;
    }
  }

  /**
   * Convert text to speech
   * @param {string} text - The text to convert to speech
   * @param {string} voice - The voice to use (default: 'alloy')
   * @returns {Promise<Blob>} The audio as a Blob
   */
  async textToSpeech(text, voice = "alloy") {
    try {
      const response = await this.api.post(
        "/api/speech/synthesize",
        { text, voice },
        { responseType: "blob" }
      );
      return response.data;
    } catch (error) {
      console.error("Error converting text to speech:", error);
      throw error;
    }
  }

  /**
   * Process audio with the speech-to-text-to-GPT-to-speech pipeline
   * @param {Blob} audioBlob - The audio blob to process
   * @param {boolean} processText - Whether to process the text with GPT
   * @param {string} voice - The voice to use for the response
   * @returns {Promise<Blob>} The audio response as a Blob
   */
  async processAudio(audioBlob, processText = true, voice = "alloy") {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await this.api.post("/api/speech/process", formData, {
        params: { process_text: processText, voice },
        headers: {
          "Content-Type": "multipart/form-data",
        },
        responseType: "blob",
      });

      return response.data;
    } catch (error) {
      console.error("Error processing audio:", error);
      throw error;
    }
  }

  /**
   * Convert speech to text
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @returns {Promise<string>} The transcribed text
   */
  async speechToText(audioBlob) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob);

      const response = await this.api.post("/api/speech/transcribe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.text;
    } catch (error) {
      console.error("Error transcribing speech:", error);
      throw error;
    }
  }

  /**
   * Generate a roadmap from a text prompt using GPT
   * @param {string} prompt - The prompt describing the roadmap to generate
   * @returns {Promise<Object>} The roadmap data
   */
  async generateRoadmap(prompt) {
    try {
      // Here we're using the GPT endpoint to generate the roadmap content
      // In a real app, you might want a dedicated endpoint for roadmap generation
      const response = await this.api.post("/api/speech/gpt", {
        text: `Generate a detailed roadmap for: ${prompt}. Format it as a hierarchical JSON tree structure.`,
      });

      // Parse the response to extract the roadmap data
      // This would need to be adapted based on your backend implementation
      const roadmapData = this.extractRoadmapFromResponse(
        response.data.response
      );
      return roadmapData;
    } catch (error) {
      console.error("Error generating roadmap:", error);
      throw error;
    }
  }

  /**
   * Parse the GPT response to extract a roadmap structure
   * (This is a simple implementation - you might need to adapt it based on your backend response format)
   * @param {string} response - The GPT response
   * @returns {Object} The parsed roadmap data
   */
  extractRoadmapFromResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/```\s*([\s\S]*?)\s*```/) || [null, response];

      const jsonStr = jsonMatch[1];
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Error parsing roadmap from response:", error);
      throw new Error("Failed to parse roadmap data from response");
    }
  }
}

// Create and export a singleton instance
const aiService = new AIService();
export default aiService;
