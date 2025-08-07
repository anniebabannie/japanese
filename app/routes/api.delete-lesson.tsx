import { db } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";
import type { ActionFunctionArgs } from "react-router";

export async function action(args: ActionFunctionArgs) {
  if (args.request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Require authentication
    const userId = await requireAuth(args);
    
    const url = new URL(args.request.url);
    const lessonId = url.searchParams.get("id");
    
    if (!lessonId) {
      return new Response("Lesson ID required", { status: 400 });
    }

    console.log("DELETE request received for lesson:", lessonId);
    
    // Ensure user can only delete their own lessons
    await db.lesson.deleteMany({
      where: { 
        id: lessonId,
        userId: userId,
      },
    });
    
    console.log("Lesson deleted successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to delete lesson" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 