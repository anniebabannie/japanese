import { updateReadingSRS, updateMeaningSRS } from "../lib/srs.server";
import { db } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";
import type { ActionFunctionArgs } from "react-router";

export async function action(args: ActionFunctionArgs) {
  try {
    // Require authentication
    const userId = await requireAuth(args);
    
    const formData = await args.request.formData();
    const vocabularyId = formData.get("vocabularyId") as string;
    const studyMode = formData.get("studyMode") as string; // 'reading' or 'meaning'
    const quality = parseInt(formData.get("quality") as string);
    const lessonId = formData.get("lessonId") as string;

    if (!vocabularyId || !studyMode || isNaN(quality) || quality < 0 || quality > 3 ||
        !['reading', 'meaning'].includes(studyMode)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid vocabularyId, studyMode, or quality rating (must be 0-3)" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the appropriate SRS record based on study mode
    const updatedRecord = studyMode === 'reading' 
      ? await updateReadingSRS(userId, vocabularyId, quality, lessonId)
      : await updateMeaningSRS(userId, vocabularyId, quality, lessonId);

    // Get ONLY the due items (not all items) for this lesson and study mode  
    const updatedDueItems = studyMode === 'reading'
      ? await db.readingSRS.findMany({
          where: {
            userId,
            lessonId,
            nextReview: { lte: new Date() }
          },
          include: { vocabulary: true },
          orderBy: { nextReview: 'asc' }
        })
      : await db.meaningSRS.findMany({
          where: {
            userId,
            lessonId,
            nextReview: { lte: new Date() }
          },
          include: { vocabulary: true },
          orderBy: { nextReview: 'asc' }
        });

    return new Response(JSON.stringify({
      success: true,
      record: {
        id: updatedRecord.id,
        repetition: updatedRecord.repetition,
        easiness: updatedRecord.easiness,
        interval: updatedRecord.interval,
        nextReview: updatedRecord.nextReview,
        quality: updatedRecord.quality,
        studyMode: studyMode,
        needsReReview: quality < 2 // Items scoring < 2 need same-day re-review
      },
      updatedDueItems: updatedDueItems.map((item: any) => ({
        id: item.id,
        vocabularyId: item.vocabularyId,
        lessonId: item.lessonId,
        repetition: item.repetition,
        easiness: item.easiness,
        interval: item.interval,
        nextReview: item.nextReview,
        quality: item.quality,
        vocabulary: {
          id: item.vocabulary.id,
          word: item.vocabulary.word,
          reading: item.vocabulary.reading,
          meaning: item.vocabulary.meaning
        }
      }))
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