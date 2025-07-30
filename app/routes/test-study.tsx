import { db } from "../lib/db.server";
import { getOrCreateSRSRecord } from "../lib/srs.server";

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

    const testUserId = "default-user";
    console.log("Setting up SRS records for study testing...");

    // Create SRS records for all vocabulary in the lesson
    const srsRecords = [];
    for (const vocab of lesson.vocabulary) {
      const srsRecord = await getOrCreateSRSRecord(testUserId, vocab.id, lesson.id);
      srsRecords.push(srsRecord);
      console.log(`✅ Created SRS record for: ${vocab.word}`);
    }

    // Set some items as due for review (nextReview in the past)
    const dueItems = srsRecords.slice(0, 3); // First 3 items
    for (const record of dueItems) {
      await db.vocabularySRS.update({
        where: { id: record.id },
        data: { nextReview: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 1 day ago
      });
      console.log(`✅ Set ${record.vocabulary.word} as due for review`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "SRS records set up for study testing",
      lessonId: lesson.id,
      totalVocabulary: lesson.vocabulary.length,
      dueItems: dueItems.length,
      vocabulary: lesson.vocabulary.map(v => ({
        id: v.id,
        word: v.word,
        reading: v.reading,
        meaning: v.meaning
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ Study test setup failed:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default function TestStudy() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Study Test Setup</h1>
      <p className="text-green-600">Check the server console for setup results!</p>
      <p className="text-gray-600 mt-2">
        After running this test, go to a lesson page and click the "Study" button to test the SRS interface.
      </p>
    </div>
  );
} 