import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_BASE_URL,
  MODEL,
} from "$env/static/private";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionCreateParams,
} from "openai/resources/index.mjs";
import fs from "fs";
import { carprices } from "./carprices";

// Load system prompt
const systemPrompt = await fs.promises.readFile("src/system-prompt.md", {
  encoding: "utf-8",
});

// Initialize the message queue
const initializeMessages = (): ChatCompletionMessageParam[] => [
  {
    role: "system",
    content: systemPrompt,
  },
  {
    role: "assistant",
    content: "Wie kann ich dir dein Fahrerlebnis heute verschönern?",
  },
];

// Haversine formula to calculate distance between two locations
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLon / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Simulate external API calls
const getExternalData = async (
  action: string,
  parameters: any,
  userLocation: { lat: number; lon: number } | null
): Promise<string> => {
  switch (action) {
    case "get_branches":
      const branches = await fetchBranches(userLocation);
      return JSON.stringify(branches);

    case "get_vehicles":
      return await fetchVehicles(parameters.branchId);

    case "get_vehicle_price_info":
      return JSON.stringify(carprices);

    default:
      return "I couldn't find the requested information.";
  }
};

// Fetch branch data and calculate distances
const fetchBranches = async (
  userLocation: { lat: number; lon: number } | null
): Promise<any[]> => {
  const response = await fetch(
    "https://go.api.gourban.services/v1/go-red/front/branches"
  );
  const branches = await response.json();

  if (userLocation) {
    branches.forEach((branch: any) => {
      const { coordinates } = branch.position;
      branch.distance = calculateDistance(
        userLocation.lat,
        userLocation.lon,
        coordinates[1], // latitude
        coordinates[0] // longitude
      );
    });
  }
  return branches;
};

// Fetch vehicles available at a branch
const fetchVehicles = async (branchId: string): Promise<string> => {
  const response = await fetch(
    `https://go.api.gourban.services/v1/go-red/front/vehicles/categories?branchId=${branchId}`
  );
  return await response.text();
};

// OpenAI chat completion tool setup
const setupTools = (): ChatCompletionTool[] => [
  {
    type: "function",
    function: {
      name: "get_branches",
      description: "This endpoint returns a list of all booking locations.",
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicles",
      description: "Get the list of vehicles available at a specific branch.",
      parameters: {
        type: "object",
        properties: {
          branchId: {
            type: "string",
            description: "The ID of the branch to fetch vehicles for.",
          },
        },
        required: ["branchId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vehicle_price_info",
      description: "Get the pricing list for all vehicles",
    },
  },
  {
    type: "function",
    function: {
      name: "get_train_schedule",
      description: "Get the next train schedule between two stations",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "The departure station",
          },
          to: {
            type: "string",
            description: "The arrival station",
          },
        },
        required: ["from", "to"],
      },
    },
  },
];

// Function to call OpenAI's API for chat completions
const callOpenAI = async (
  openai: OpenAI,
  messages: ChatCompletionMessageParam[],
  options: OpenAI.RequestOptions
) => {
  return await openai.chat.completions.create(
    {
      messages,
      model: MODEL,
      tools: setupTools(),
      tool_choice: "auto",
    } as ChatCompletionCreateParams,
    options
  );
};

// Handle POST request
export const POST: RequestHandler = async ({ request }) => {
  const { userMessage, userLocation } = await request.json();

  const openai: OpenAI = new OpenAI({
    baseURL: AZURE_OPENAI_BASE_URL,
    apiKey: AZURE_OPENAI_API_KEY,
    defaultQuery: { "api-version": "2024-05-01-preview" },
    defaultHeaders: { "api-key": AZURE_OPENAI_API_KEY },
  });

  let messages = initializeMessages();
  messages.push({
    role: "user",
    content: userMessage,
  });

  const options: OpenAI.RequestOptions = {
    path: `openai/deployments/${MODEL}/chat/completions`,
  };

  // Get the first response from OpenAI
  const response = await callOpenAI(openai, messages, options);
  const responseMessage = response.choices[0].message;

  if (responseMessage.tool_calls) {
    const toolCall = responseMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    // Call the appropriate tool and pass user location if needed
    const functionResult = await getExternalData(
      functionName,
      functionArgs,
      userLocation
    );

    messages.push(responseMessage);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: functionResult,
    });

    // Get a second response with tool results
    const secondResponse = await callOpenAI(openai, messages, options);
    const aiMessage = secondResponse.choices[0].message.content;

    messages.push({
      role: "assistant",
      content: aiMessage,
    });

    return json({ aiMessage });
  } else {
    const aiMessage = responseMessage.content;
    messages.push({
      role: "assistant",
      content: aiMessage,
    });

    return json({ aiMessage });
  }
};
