import { updateSRSRecord } from "../lib/srs.server";

export async function action({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const vocabularyId = formData.get("vocabularyId") as string;
    const readingQuality = parseInt(formData.get("readingQuality") as string);
    const meaningQuality = parseInt(formData.get("meaningQuality") as string);
    const lessonId = formData.get("lessonId") as string;
    const userId = formData.get("userId") as string || "default-user"; // For now, use a default user

    if (!vocabularyId || isNaN(readingQuality) || readingQuality < 0 || readingQuality > 3 ||
        isNaN(meaningQuality) || meaningQuality < 0 || meaningQuality > 3) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid vocabularyId or quality ratings (must be 0-3)" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update SRS record with both reading and meaning quality ratings
    const updatedRecord = await updateSRSRecord(userId, vocabularyId, readingQuality, meaningQuality, lessonId);

    return new Response(JSON.stringify({
      success: true,
      record: {
        id: updatedRecord.id,
        repetition: updatedRecord.repetition,
        easiness: updatedRecord.easiness,
        interval: updatedRecord.interval,
        nextReview: updatedRecord.nextReview,
        readingQuality: updatedRecord.readingQuality,
        meaningQuality: updatedRecord.meaningQuality,
        needsReReview: Math.min(readingQuality, meaningQuality) < 2 // Items scoring < 2 need same-day re-review
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