import { db } from "../lib/db.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { lessonId, word, reading, meaning, originalForm, conjugationInfo } = await request.json();

    if (!lessonId || !word || !meaning) {
      return new Response("Lesson ID, word, and meaning are required", { status: 400 });
    }

    // Shift all existing vocabulary words down by 1 to make room at the top
    await db.vocabulary.updateMany({
      where: { lessonId },
      data: {
        order: {
          increment: 1
        }
      }
    });

    // Add the new vocabulary word at the top (order 0)
    const newVocab = await db.vocabulary.create({
      data: {
        lessonId,
        word,
        reading: reading || null,
        meaning,
        originalForm: originalForm || null,
        conjugationInfo: conjugationInfo || null,
        order: 0,
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      vocabulary: newVocab 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error adding vocabulary:", error);
    return new Response(JSON.stringify({ error: "Failed to add vocabulary" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 