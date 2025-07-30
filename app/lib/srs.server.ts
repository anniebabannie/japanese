import { db } from "./db.server";

// SM-2 Algorithm implementation
export function sm2Algorithm(
  repetition: number,
  easiness: number,
  interval: number,
  quality: number
): { repetition: number; easiness: number; interval: number; nextReview: Date } {
  
  // Calculate new easiness factor
  const newEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const finalEasiness = Math.max(1.3, newEasiness); // Minimum 1.3
  
  let newRepetition: number;
  let newInterval: number;
  
  if (quality < 3) {
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
  quality: number,
  lessonId?: string
) {
  const srsRecord = await getOrCreateSRSRecord(userId, vocabularyId, lessonId || "");
  
  const newData = sm2Algorithm(
    srsRecord.repetition,
    srsRecord.easiness,
    srsRecord.interval,
    quality
  );

  return await db.vocabularySRS.update({
    where: { id: srsRecord.id },
    data: {
      ...newData,
      quality,
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

  return {
    totalItems,
    dueItems,
    averageEasiness,
    averageQuality: totalItems > 0 
      ? records.filter((r: any) => r.quality !== null)
          .reduce((sum: number, r: any) => sum + (r.quality || 0), 0) / records.filter((r: any) => r.quality !== null).length
      : 0
  };
} 