import { db } from "./db.server";

// SM-2 Algorithm implementation
export function sm2Algorithm(
  repetition: number,
  easiness: number,
  interval: number,
  quality: number
): { repetition: number; easiness: number; interval: number; nextReview: Date } {
  
  // Convert 0-3 scale to 0-5 scale for SM-2 algorithm
  // 0 -> 0, 1 -> 2, 2 -> 4, 3 -> 5
  const convertedQuality = quality === 0 ? 0 : quality === 1 ? 2 : quality === 2 ? 4 : 5;
  
  // Calculate new easiness factor
  const newEasiness = easiness + (0.1 - (5 - convertedQuality) * (0.08 + (5 - convertedQuality) * 0.02));
  const finalEasiness = Math.max(1.3, newEasiness); // Minimum 1.3
  
  let newRepetition: number;
  let newInterval: number;
  
  if (convertedQuality < 3) {
    // Reset to beginning
    newRepetition = 0;
    newInterval = 0;
  } else {
    // Successful repetition
    newRepetition = repetition + 1;
    
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * finalEasiness);
    }
  }
  
  return {
    repetition: newRepetition,
    easiness: finalEasiness,
    interval: newInterval,
    nextReview: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000)
  };
}

// Basic CRUD functions for SRS records
export async function getOrCreateSRSRecord(
  userId: string,
  vocabularyId: string,
  lessonId: string
) {
  let srsRecord = await db.vocabularySRS.findUnique({
    where: { userId_vocabularyId: { userId, vocabularyId } },
    include: { vocabulary: true }
  });

  if (!srsRecord) {
    // Create new SRS record for this vocabulary
    srsRecord = await db.vocabularySRS.create({
      data: {
        userId,
        vocabularyId,
        lessonId,
        repetition: 0,
        easiness: 2.5,
        interval: 0,
        nextReview: new Date(),
        totalReviews: 0
      },
      include: { vocabulary: true }
    });
  }

  return srsRecord;
}

export async function updateSRSRecord(
  userId: string,
  vocabularyId: string,
  readingQuality: number,
  meaningQuality: number,
  lessonId?: string
) {
  const srsRecord = await getOrCreateSRSRecord(userId, vocabularyId, lessonId || "");
  
  // Use the lower quality rating to determine the overall SRS progression
  // This ensures both skills are mastered before moving to longer intervals
  const overallQuality = Math.min(readingQuality, meaningQuality);
  
  const newData = sm2Algorithm(
    srsRecord.repetition,
    srsRecord.easiness,
    srsRecord.interval,
    overallQuality
  );

  return await db.vocabularySRS.update({
    where: { id: srsRecord.id },
    data: {
      ...newData,
      readingQuality,
      meaningQuality,
      totalReviews: srsRecord.totalReviews + 1,
      lastReviewed: new Date()
    },
    include: { vocabulary: true }
  });
}

export async function getDueItems(userId: string, lessonId?: string) {
  const whereClause: any = {
    userId,
    nextReview: { lte: new Date() }
  };

  if (lessonId) {
    whereClause.lessonId = lessonId;
  }

  return await db.vocabularySRS.findMany({
    where: whereClause,
    include: { vocabulary: true },
    orderBy: { nextReview: 'asc' }
  });
}

export async function getAllLessonVocabulary(userId: string, lessonId: string) {
  // Get all vocabulary for the lesson
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { vocabulary: true }
  });

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // Get or create SRS records for all vocabulary
  const srsRecords = [];
  for (const vocab of lesson.vocabulary) {
    const srsRecord = await getOrCreateSRSRecord(userId, vocab.id, lessonId);
    srsRecords.push(srsRecord);
  }

  return srsRecords;
}

export async function getSRSStats(userId: string, lessonId?: string) {
  const whereClause: any = { userId };
  if (lessonId) {
    whereClause.lessonId = lessonId;
  }

  const records = await db.vocabularySRS.findMany({
    where: whereClause
  });

  const totalItems = records.length;
  const dueItems = records.filter((r: any) => r.nextReview <= new Date()).length;
  const averageEasiness = totalItems > 0 
    ? records.reduce((sum: number, r: any) => sum + r.easiness, 0) / totalItems 
    : 0;

  // Calculate average quality for both reading and meaning
  const readingRecords = records.filter((r: any) => r.readingQuality !== null);
  const meaningRecords = records.filter((r: any) => r.meaningQuality !== null);
  
  const averageReadingQuality = readingRecords.length > 0 
    ? readingRecords.reduce((sum: number, r: any) => sum + (r.readingQuality || 0), 0) / readingRecords.length
    : 0;
    
  const averageMeaningQuality = meaningRecords.length > 0 
    ? meaningRecords.reduce((sum: number, r: any) => sum + (r.meaningQuality || 0), 0) / meaningRecords.length
    : 0;

  return {
    totalItems,
    dueItems,
    averageEasiness,
    averageReadingQuality,
    averageMeaningQuality
  };
} 