import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_BASE_URL,
  MODEL,
} from "$env/static/private";

export const POST: RequestHandler = async ({ request }) => {
  const { message } = await request.json();

  const response = await fetch(
    `${AZURE_OPENAI_BASE_URL}/openai/deployments/${MODEL}/completions?api-version=2023-05-15`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        prompt: message,
        max_tokens: 150,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
      }),
    }
  );

  if (!response.ok) {
    return json(
      { error: "Failed to get response from Azure OpenAI" },
      { status: 500 }
    );
  }

  const data = await response.json();
  return json({ reply: data.choices[0].text.trim() });
};
