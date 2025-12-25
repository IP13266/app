import { GoogleGenAI } from "@google/genai";
import { fileToBase64, getEnv } from "./utils";
import type { ServiceConfig } from "../types";

// Helper to handle fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 120000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const cleanBaseUrl = (url?: string) => {
  if (!url) return "";
  return url.replace(/\/$/, ""); 
};

/**
 * Step 1: Reverse Prompting (Vision Analysis)
 * Uses Google GenAI SDK to describe the image.
 */
export const describeImage = async (
  file: File, 
  config: ServiceConfig,
  onStreamUpdate?: (text: string) => void
): Promise<string> => {
  // 1. Get and Clean API Key
  // Try config first, then env
  let apiKey = config.apiKey || getEnv('API_KEY');
  
  if (!apiKey) throw new Error("API Key for Analysis step is missing. Please check Settings.");
  apiKey = apiKey.trim(); 

  // 2. Configure Client
  const clientConfig: any = { apiKey };
  
  // Check if user is using a custom gateway
  if (config.baseUrl && config.baseUrl.trim().length > 0) {
      clientConfig.baseUrl = cleanBaseUrl(config.baseUrl);
  }

  const ai = new GoogleGenAI(clientConfig);
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  
  const model = config.model || 'gemini-3-flash-preview';
  const promptText = "Describe this image in detail to generate a similar image. Do not use conversational filler.";

  try {
    console.log(`[Vision] Connecting to model: ${model}`);
    if (clientConfig.baseUrl) {
      console.log(`[Vision] Using Custom Base URL: ${clientConfig.baseUrl}`);
    } else {
      console.log(`[Vision] Using Official Google Endpoint`);
    }

    const streamResponse = await ai.models.generateContentStream({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: promptText
          }
        ]
      },
      config: {
        systemInstruction: config.systemInstruction
      }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      if (chunk.text) {
        fullText += chunk.text;
        if (onStreamUpdate) {
          onStreamUpdate(fullText);
        }
      }
    }

    return fullText || "No description generated.";
  } catch (error: any) {
    console.error("Describe Image Error:", error);
    let msg = error.message || "Unknown error";
    
    // Specific guidance for the common 400 error
    if (msg.includes("400") || msg.includes("API_KEY_INVALID")) {
        const usingCustomUrl = config.baseUrl && config.baseUrl.trim().length > 0;
        if (!usingCustomUrl) {
           msg += " \n\n[HINT] You are hitting Google Official. If you are using a proxy Key (like Apicore), you MUST set the Base URL in Settings -> Step 1.";
        } else {
           msg += " \n\n[HINT] Key rejected by your custom endpoint. Check if the key is correct.";
        }
    }
    throw new Error(`Analysis failed: ${msg}`);
  }
};

/**
 * Step 2: Generation (Text-to-Image)
 */
export const generateVariation = async (originalFile: File, prompt: string, config: ServiceConfig): Promise<string> => {
  let apiKey = config.apiKey || getEnv('API_KEY');
  if (!apiKey) throw new Error("API Key for Generation step is missing.");
  apiKey = apiKey.trim();

  // Use default "https://api.apicore.ai/v1" or whatever is in config
  let baseUrl = cleanBaseUrl(config.baseUrl?.trim());
  if (!baseUrl) baseUrl = "https://api.apicore.ai/v1"; 

  const model = config.model?.trim() || 'gemini-3-pro-image-preview';
  
  const finalPrompt = config.systemInstruction 
    ? `${config.systemInstruction}\n\nPositive Prompt: ${prompt}`
    : prompt;

  const size = config.aspectRatio || "16:9";

  const payload = {
    model: model,
    prompt: finalPrompt,
    size: size,
    n: 1
  };

  try {
    console.log(`[Generation] Posting to ${baseUrl} with model ${model}`);
    
    const response = await fetchWithTimeout(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let detailedError = `API Error ${response.status}: ${response.statusText}`;
      try {
          const jsonErr = JSON.parse(errText);
          if (jsonErr.error && jsonErr.error.message) {
              detailedError += ` - ${jsonErr.error.message}`;
          } else {
              detailedError += `\nRaw: ${errText.substring(0, 300)}`;
          }
      } catch(e) {
         detailedError += `\nRaw: ${errText.substring(0, 300)}`;
      }
      throw new Error(detailedError);
    }

    const data = await response.json();

    if (data.data?.[0]?.url) {
      return data.data[0].url;
    }
    
    if (data.data?.[0]?.b64_json) {
       return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    throw new Error(`Invalid Response Structure: ${JSON.stringify(data).substring(0, 200)}...`);

  } catch (error: any) {
    console.error("Generate Variation Error:", error);
    throw new Error(error.message); 
  }
};