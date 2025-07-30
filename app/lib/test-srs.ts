import { getOrCreateSRSRecord, updateSRSRecord, getSRSStats } from "./srs.server";
import { db } from "./db.server";

// Test function to verify SRS functionality
export async function testSRSFunctions() {
  const testUserId = "test-user-123";
  
  try {
    console.log("Testing SRS functions...");
    
    // First, get a real lesson and vocabulary from the database
    const lesson = await db.lesson.findFirst({
      include: { vocabulary: true }
    });
    
    if (!lesson || lesson.vocabulary.length === 0) {
      console.log("❌ No lessons or vocabulary found in database");
      return;
    }
    
    const testLessonId = lesson.id;
    const testVocabularyId = lesson.vocabulary[0].id;
    
    console.log(`Using lesson: ${lesson.title}, vocabulary: ${lesson.vocabulary[0].word}`);
    
    // Test 1: Get or create SRS record
    console.log("1. Testing getOrCreateSRSRecord...");
    const srsRecord = await getOrCreateSRSRecord(testUserId, testVocabularyId, testLessonId);
    console.log("✅ SRS record created/retrieved:", {
      id: srsRecord.id,
      repetition: srsRecord.repetition,
      easiness: srsRecord.easiness,
      interval: srsRecord.interval
    });
    
    // Test 2: Update SRS record with quality rating
    console.log("2. Testing updateSRSRecord...");
    const updatedRecord = await updateSRSRecord(testUserId, testVocabularyId, 4, testLessonId);
    console.log("✅ SRS record updated:", {
      repetition: updatedRecord.repetition,
      easiness: updatedRecord.easiness,
      interval: updatedRecord.interval,
      quality: updatedRecord.quality
    });
    
    // Test 3: Get SRS stats
    console.log("3. Testing getSRSStats...");
    const stats = await getSRSStats(testUserId, testLessonId);
    console.log("✅ SRS stats:", stats);
    
    console.log("🎉 All SRS tests passed!");
    
  } catch (error) {
    console.error("❌ SRS test failed:", error);
  }
} 