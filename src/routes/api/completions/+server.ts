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
  // In a real scenario, this function would make actual API calls
  switch (action) {
    case "get_weather":
      return `The weather in ${parameters.location} is sunny with a temperature of 22°C.`;
    case "get_train_schedule":
      return `The next train from ${parameters.from} to ${parameters.to} departs at 14:30.`;
    default:
      return "I couldn't find the requested information.";
  }
}

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and country, e.g. Vienna, Austria",
          },
        },
        required: ["location"],
      },
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
