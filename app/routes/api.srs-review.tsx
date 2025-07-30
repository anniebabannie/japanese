import { updateSRSRecord } from "../lib/srs.server";

export async function action({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const vocabularyId = formData.get("vocabularyId") as string;
    const quality = parseInt(formData.get("quality") as string);
    const lessonId = formData.get("lessonId") as string;
    const userId = formData.get("userId") as string || "default-user"; // For now, use a default user

    if (!vocabularyId || isNaN(quality) || quality < 0 || quality > 5) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid vocabularyId or quality rating" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update SRS record with the quality rating
    const updatedRecord = await updateSRSRecord(userId, vocabularyId, quality, lessonId);

    return new Response(JSON.stringify({
      success: true,
      record: {
        id: updatedRecord.id,
        repetition: updatedRecord.repetition,
        easiness: updatedRecord.easiness,
        interval: updatedRecord.interval,
        nextReview: updatedRecord.nextReview,
        quality: updatedRecord.quality,
        needsReReview: quality < 4 // Items scoring < 4 need same-day re-review
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error updating SRS record:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Failed to update SRS record" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 