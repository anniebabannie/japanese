import { db } from "../lib/db.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const lessonId = url.searchParams.get("id");
    
    if (!lessonId) {
      return new Response("Lesson ID required", { status: 400 });
    }

    console.log("DELETE request received for lesson:", lessonId);
    
    await db.lesson.delete({
      where: { id: lessonId },
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