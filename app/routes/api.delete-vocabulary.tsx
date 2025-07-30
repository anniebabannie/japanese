import { db } from "../lib/db.server";

export async function action({ request }: { request: Request }) {
  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const vocabularyId = url.searchParams.get("id");
    
    if (!vocabularyId) {
      return new Response("Vocabulary ID required", { status: 400 });
    }

    console.log("DELETE request received for vocabulary:", vocabularyId);
    
    await db.vocabulary.delete({
      where: { id: vocabularyId },
    });
    
    console.log("Vocabulary deleted successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error deleting vocabulary:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to delete vocabulary" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 