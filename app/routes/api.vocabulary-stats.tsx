import { db } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";
import type { ActionFunctionArgs } from "react-router";

export async function action(args: ActionFunctionArgs) {
  try {
    // Require authentication
    const userId = await requireAuth(args);
    
    const body = await args.request.json();
    const { lessonId } = body;

    if (!lessonId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "lessonId is required" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all vocabulary for the lesson - ensure it belongs to the user
    const lesson = await db.lesson.findFirst({
      where: { 
        id: lessonId,
        userId: userId,
      },
      include: { 
        vocabulary: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!lesson) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Lesson not found" 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all reading and meaning SRS records for this lesson
    const [readingSRSRecords, meaningSRSRecords] = await Promise.all([
      db.readingSRS.findMany({
        where: {
          userId,
          lessonId
        },
        include: { vocabulary: true }
      }),
      db.meaningSRS.findMany({
        where: {
          userId,
          lessonId
        },
        include: { vocabulary: true }
      })
    ]);

    // Create lookup maps for SRS records
    const readingSRSMap = new Map(
      readingSRSRecords.map(record => [record.vocabularyId, record])
    );
    const meaningSRSMap = new Map(
      meaningSRSRecords.map(record => [record.vocabularyId, record])
    );

    // Combine vocabulary with SRS progress
    const vocabularyStats = lesson.vocabulary.map(vocab => {
      const readingProgress = readingSRSMap.get(vocab.id);
      const meaningProgress = meaningSRSMap.get(vocab.id);

      return {
        id: vocab.id,
        word: vocab.word,
        reading: vocab.reading,
        meaning: vocab.meaning,
        readingProgress: readingProgress ? {
          quality: readingProgress.quality,
          repetition: readingProgress.repetition,
          nextReview: readingProgress.nextReview.toISOString(),
          interval: readingProgress.interval,
        } : null,
        meaningProgress: meaningProgress ? {
          quality: meaningProgress.quality,
          repetition: meaningProgress.repetition,
          nextReview: meaningProgress.nextReview.toISOString(),
          interval: meaningProgress.interval,
        } : null,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      vocabularyStats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error getting vocabulary stats:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Failed to get vocabulary stats" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}