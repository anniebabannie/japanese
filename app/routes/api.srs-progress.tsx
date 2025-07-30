import { getDueItems, getSRSStats } from "../lib/srs.server";

export async function action({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId") as string || "default-user";
    const lessonId = formData.get("lessonId") as string;

    // Get due items for review
    const dueItems = await getDueItems(userId, lessonId);
    
    // Get SRS statistics
    const stats = await getSRSStats(userId, lessonId);

    return new Response(JSON.stringify({
      success: true,
      dueItems: dueItems.map((item: any) => ({
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
      })),
      stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error getting SRS progress:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Failed to get SRS progress" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 