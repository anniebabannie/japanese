import { db } from "../lib/db.server";

export async function loader() {
  try {
    // Get a real lesson and vocabulary for testing
    const lesson = await db.lesson.findFirst({
      include: { vocabulary: true }
    });

    if (!lesson || lesson.vocabulary.length === 0) {
      return new Response(JSON.stringify({ error: "No lessons found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const testVocabularyId = lesson.vocabulary[0].id;
    const testLessonId = lesson.id;
    const testUserId = "test-user-123";

    console.log("Testing SRS API endpoints...");

    // Test 1: Submit a review
    console.log("1. Testing SRS review submission...");
    const reviewFormData = new FormData();
    reviewFormData.append("vocabularyId", testVocabularyId);
    reviewFormData.append("quality", "4");
    reviewFormData.append("lessonId", testLessonId);
    reviewFormData.append("userId", testUserId);

    const reviewResponse = await fetch("http://localhost:5173/api/srs-review", {
      method: "POST",
      body: reviewFormData
    });

    const reviewResult = await reviewResponse.json();
    console.log("✅ Review submission result:", reviewResult);

    // Test 2: Get progress
    console.log("2. Testing SRS progress retrieval...");
    const progressFormData = new FormData();
    progressFormData.append("userId", testUserId);
    progressFormData.append("lessonId", testLessonId);

    const progressResponse = await fetch("http://localhost:5173/api/srs-progress", {
      method: "POST",
      body: progressFormData
    });

    const progressResult = await progressResponse.json();
    console.log("✅ Progress retrieval result:", progressResult);

    return new Response(JSON.stringify({
      success: true,
      message: "API tests completed successfully",
      reviewResult,
      progressResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ API test failed:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default function TestAPI() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SRS API Test Results</h1>
      <p className="text-green-600">Check the server console for API test results!</p>
    </div>
  );
} 