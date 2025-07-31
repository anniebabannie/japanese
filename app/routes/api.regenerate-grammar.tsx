import { db } from "../lib/db.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { lessonId } = await request.json();
    
    if (!lessonId) {
      return new Response("Lesson ID required", { status: 400 });
    }

    console.log("Regenerating grammar points for lesson:", lessonId);
    
    // Get the lesson data
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        grammarPoints: { orderBy: { order: 'asc' } },
      },
    });

    if (!lesson) {
      return new Response("Lesson not found", { status: 404 });
    }

    // Import the regenerate function
    const { regenerateGrammarPoints } = await import("../lib/ai.server");

    // Generate new grammar points
    const newGrammarPoints = await regenerateGrammarPoints(lessonId, {
      story: lesson.story,
      level: lesson.level,
    });

    // Delete existing grammar points
    await db.grammarPoint.deleteMany({
      where: { lessonId },
    });

    // Save new grammar points
    const savedGrammarPoints = await Promise.all(
      newGrammarPoints.map((gp, index) =>
        db.grammarPoint.create({
          data: {
            lessonId,
            point: gp.point,
            explanation: gp.explanation,
            examples: gp.examples,
            order: index,
          },
        })
      )
    );

    console.log("Grammar points regenerated successfully");
    return new Response(JSON.stringify({ 
      success: true, 
      grammarPoints: savedGrammarPoints 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error regenerating grammar points:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Failed to regenerate grammar points" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 