import { lookupJapaneseWord } from "../lib/ai.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { word } = await request.json();

    if (!word) {
      return new Response("Word is required", { status: 400 });
    }

    const wordData = await lookupJapaneseWord(word);

    return new Response(JSON.stringify(wordData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error looking up word:", error);
    return new Response(JSON.stringify({ error: "Failed to look up word" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 