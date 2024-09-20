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
// import { getAllItems, queryItems } from "$lib/cosmosClient";
import { carprices } from "./carprices";

function getRandomGermanFirstnames(n = 5) {
  // List of common German first names
  const germanFirstnames = [
    "Lukas", "Leon", "Luca", "Ben", "Finn", "Elias",
    "Paul", "Noah", "Tim", "Luis", "Jonas", "Lara",
    "Anna", "Mia", "Lea", "Emma", "Sophie", "Marie",
    "Lina", "Emilia", "Hannah", "Laura", "Ella", "Sophia"
  ];

  // Ensure n is not greater than the number of available names
  n = Math.min(n, germanFirstnames.length);

  // Select n random names without replacement
  const selectedNames = [];
  const usedIndices = new Set();

  while (selectedNames.length < n) {
    const randomIndex = Math.floor(Math.random() * germanFirstnames.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      selectedNames.push(germanFirstnames[randomIndex]);
    }
  }

  return selectedNames;
}

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


// Fetch branch data and calculate distances
const fetchBranches = async (
    userLocation: { lat: number; lon: number } | null
): Promise<any[]> => {
  const response = await fetch(
      "https://go.api.gourban.services/v1/rad8964z/front/branches"
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

// Mock function to simulate external API calls
async function getExternalData(
  action: string,
  parameters: any,
  userLocation: { lat: number; lon: number } | null
): Promise<string> {
  switch (action) {
    case "get_branches":
      const branches = await fetchBranches(userLocation);
      return JSON.stringify(branches);

    case "get_vehicles":
      const { branchId } = parameters;
      return await fetchVehicles(parameters.branchId);

    case "get_vehicle_price_info":
      return JSON.stringify(carprices);
    case "get_train_schedule":
      return JSON.stringify({
        delayed: true,
        delayTime: '15min',
        recommendation: 'Use Rail&Drive to get to the destination'
      });
    case "get_other_rides": {
      return JSON.stringify([{
        name: getRandomGermanFirstnames(1)[0],
        from: parameters.from,
        to: parameters.to,
        drivingStyle: 'Very calm in previous rides'
      }]);
    }
    case "book_rental_car": {
      return JSON.stringify([{
        fromTime: parameters.fromTime,
        toTime: parameters.toTime,
        fromLocation: parameters.fromLocation,
        toLocation: parameters.toLocation,
        car: parameters.car,
        status: "Sucessfull",
        note: "Car will be ready in time and please make sure the tank is fulled up at the end"
      }]);
    }
    default:
      return "I couldn't find the requested information.";
  }
};


// Fetch vehicles available at a branch
const fetchVehicles = async (branchId: string): Promise<string> => {
  const response = await fetch(
    `https://go.api.gourban.services/v1/rad8964z/front/vehicles/categories?branchId=${branchId}`
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
      name: "get_other_rides",
      description: "Finds other people that also use rail and drive with the same goal or close",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "The departure station",
          },
          to: {
            type: "string",
            description: "The destination station",
          },
          exactStartAndEnd: {
            type: "boolean",
            description: "Describes if the user is fine with also nearby stations that are not exactly the same",
          },
        },
        required: ["from", "to", "exactStartAndEnd"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_rental_car",
      description: "Can book a rental car for the user or reserve it.",
      parameters: {
        type: "object",
        properties: {
          fromLocation: {
            type: "string",
            description: "The departure station",
          },
          toLocation: {
            type: "string",
            description: "The destination station",
          },
          fromTime: {
            type: "string",
            description: "The date description when the rental starts",
          },
          endsTime: {
            type: "string",
            description: "The date description when  the estimated rental ends ",
          },
          car: {
            type: "string",
            description: "The car name or type that is reserved",
          },
          reservedOnly: {
            type: "boolean",
            description: "Describes if the user is fine with also nearby stations that are not exactly the same",
          },
        },
        required: ["fromLocation", "toLocation", "fromTime", "endsTime", "car"],
      },
    },
  },
  /*{
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
            description: "The destination station",
          },
        },
        required: ["from", "to"],
      },
    },
  },*/
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

  // Query Cosmos DB for relevant information
  // console.warn(
  //   (await getAllItems().fetchAll()).resources.map((r) => r.properties)
  // );

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
