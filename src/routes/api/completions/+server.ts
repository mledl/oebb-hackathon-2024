import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_BASE_URL,
  MODEL,
} from "$env/static/private";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool, ChatCompletionCreateParams } from "openai/resources/index.mjs";
import fs from "fs";
import {carprices} from "./carprices";

const systemPrompt = await fs.promises.readFile("src/system-prompt.md", {
  encoding: "utf-8",
});

const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: systemPrompt,
  },
  {
    role: "assistant",
    content: "Wie kann ich dir dein Fahrerlebnis heute verschönern?",
  },
];

// Mock function to simulate external API calls
async function getExternalData(action: string, parameters: any): Promise<string> {
  switch (action) {
    case "get_branches":
      const response = await fetch('https://go.api.gourban.services/v1/go-red/front/branches');
      return await response.text();

    case "get_vehicles":
      const { branchId } = parameters;
      const vehiclesResponse = await fetch(`https://go.api.gourban.services/v1/go-red/front/vehicles/categories?branchId=${branchId}`);
      return await vehiclesResponse.text();
    case "get_vehicle_price_info":
      return JSON.stringify(carprices);
    default:
      return "I couldn't find the requested information.";
  }
}

const tools: ChatCompletionTool[] = [
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
            description: "The ID of the branch to fetch vehicles for. ",
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

export const POST: RequestHandler = async ({ request }) => {
  const { userMessage } = await request.json();

  const openai: OpenAI = new OpenAI({
    baseURL: AZURE_OPENAI_BASE_URL,
    apiKey: AZURE_OPENAI_API_KEY,
    defaultQuery: { "api-version": "2024-05-01-preview" },
    defaultHeaders: { "api-key": AZURE_OPENAI_API_KEY },
  });

  const options: OpenAI.RequestOptions = {};
  options.path = `openai/deployments/${MODEL}/chat/completions`;

  messages.push({
    role: "user",
    content: userMessage,
  });

  const response = await openai.chat.completions.create(
      {
        messages,
        model: MODEL,
        tools: tools,
        tool_choice: "auto",
      } as ChatCompletionCreateParams,
      options
  );

  const responseMessage = response.choices[0].message;

  if (responseMessage.tool_calls) {
    const toolCall = responseMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    const functionResult = await getExternalData(functionName, functionArgs);

    messages.push(responseMessage);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: functionResult,
    });

    const secondResponse = await openai.chat.completions.create(
        {
          messages,
          model: MODEL,
        },
        options
    );

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