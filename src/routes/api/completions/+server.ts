import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_BASE_URL,
  MODEL,
} from "$env/static/private";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import fs from "fs";
import { getAllItems, queryItems } from "$lib/cosmosClient";

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

export const POST: RequestHandler = async ({ request }) => {
  const { userMessage } = await request.json();

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
    },
    options
  );

  const aiMessage = response.choices[0].message.content;

  messages.push({
    role: "assistant",
    content: aiMessage,
  });

  return json({ aiMessage });
};
