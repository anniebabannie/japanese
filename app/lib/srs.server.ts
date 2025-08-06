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
      // Cap maximum interval to 365 days (1 year) to prevent DateTime overflow
      newInterval = Math.min(newInterval, 365);
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
export async function getOrCreateReadingSRS(
  userId: string,
  vocabularyId: string,
  lessonId: string
) {
  let srsRecord = await db.readingSRS.findUnique({
    where: { userId_vocabularyId: { userId, vocabularyId } },
    include: { vocabulary: true }
  });

  if (!srsRecord) {
    // Create new reading SRS record
    srsRecord = await db.readingSRS.create({
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

export async function getOrCreateMeaningSRS(
  userId: string,
  vocabularyId: string,
  lessonId: string
) {
  let srsRecord = await db.meaningSRS.findUnique({
    where: { userId_vocabularyId: { userId, vocabularyId } },
    include: { vocabulary: true }
  });

  if (!srsRecord) {
    // Create new meaning SRS record
    srsRecord = await db.meaningSRS.create({
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

export async function updateReadingSRS(
  userId: string,
  vocabularyId: string,
  quality: number,
  lessonId?: string
) {
  const srsRecord = await getOrCreateReadingSRS(userId, vocabularyId, lessonId || "");
  
  const newData = sm2Algorithm(
    srsRecord.repetition,
    srsRecord.easiness,
    srsRecord.interval,
    quality
  );

  return await db.readingSRS.update({
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

export async function updateMeaningSRS(
  userId: string,
  vocabularyId: string,
  quality: number,
  lessonId?: string
) {
  const srsRecord = await getOrCreateMeaningSRS(userId, vocabularyId, lessonId || "");
  
  const newData = sm2Algorithm(
    srsRecord.repetition,
    srsRecord.easiness,
    srsRecord.interval,
    quality
  );

  return await db.meaningSRS.update({
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

export async function getDueReadingItems(userId: string, lessonId?: string) {
  if (lessonId) {
    // Get all vocabulary for the lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { vocabulary: true }
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Get existing reading SRS records that are due
    const existingReadingSRS = await db.readingSRS.findMany({
      where: {
        userId,
        lessonId,
        nextReview: { lte: new Date() }
      },
      include: { vocabulary: true },
      orderBy: { nextReview: 'asc' }
    });

    // Find vocabulary that doesn't have ANY reading SRS records yet (truly new items)
    const allExistingReadingSRS = await db.readingSRS.findMany({
      where: {
        userId,
        lessonId
      }
    });
    const existingVocabIds = allExistingReadingSRS.map(record => record.vocabularyId);
    const newVocabulary = lesson.vocabulary.filter(vocab => !existingVocabIds.includes(vocab.id));

    // Create reading SRS records for new vocabulary
    const newReadingSRS = [];
    for (const vocab of newVocabulary) {
      const srsRecord = await getOrCreateReadingSRS(userId, vocab.id, lessonId);
      newReadingSRS.push(srsRecord);
    }

    return [...existingReadingSRS, ...newReadingSRS];
  }
  
  // For general requests, only return existing due items
  return await db.readingSRS.findMany({
    where: {
      userId,
      nextReview: { lte: new Date() }
    },
    include: { vocabulary: true },
    orderBy: { nextReview: 'asc' }
  });
}

export async function getDueMeaningItems(userId: string, lessonId?: string) {
  if (lessonId) {
    // Get all vocabulary for the lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { vocabulary: true }
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Get existing meaning SRS records that are due
    const existingMeaningSRS = await db.meaningSRS.findMany({
      where: {
        userId,
        lessonId,
        nextReview: { lte: new Date() }
      },
      include: { vocabulary: true },
      orderBy: { nextReview: 'asc' }
    });

    // Find vocabulary that doesn't have ANY meaning SRS records yet (truly new items)
    const allExistingMeaningSRS = await db.meaningSRS.findMany({
      where: {
        userId,
        lessonId
      }
    });
    const existingVocabIds = allExistingMeaningSRS.map(record => record.vocabularyId);
    const newVocabulary = lesson.vocabulary.filter(vocab => !existingVocabIds.includes(vocab.id));

    // Create meaning SRS records for new vocabulary
    const newMeaningSRS = [];
    for (const vocab of newVocabulary) {
      const srsRecord = await getOrCreateMeaningSRS(userId, vocab.id, lessonId);
      newMeaningSRS.push(srsRecord);
    }

    return [...existingMeaningSRS, ...newMeaningSRS];
  }
  
  // For general requests, only return existing due items
  return await db.meaningSRS.findMany({
    where: {
      userId,
      nextReview: { lte: new Date() }
    },
    include: { vocabulary: true },
    orderBy: { nextReview: 'asc' }
  });
}

export async function getAllLessonReadingVocabulary(userId: string, lessonId: string) {
  // Get all vocabulary for the lesson
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { vocabulary: true }
  });

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // Get or create reading SRS records for all vocabulary
  const srsRecords = [];
  for (const vocab of lesson.vocabulary) {
    const srsRecord = await getOrCreateReadingSRS(userId, vocab.id, lessonId);
    srsRecords.push(srsRecord);
  }

  return srsRecords;
}

export async function getAllLessonMeaningVocabulary(userId: string, lessonId: string) {
  // Get all vocabulary for the lesson
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { vocabulary: true }
  });

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // Get or create meaning SRS records for all vocabulary
  const srsRecords = [];
  for (const vocab of lesson.vocabulary) {
    const srsRecord = await getOrCreateMeaningSRS(userId, vocab.id, lessonId);
    srsRecords.push(srsRecord);
  }

  return srsRecords;
}

export async function getSRSStats(userId: string, lessonId?: string) {
  const whereClause: any = { userId };
  if (lessonId) {
    whereClause.lessonId = lessonId;
  }

  // Get both reading and meaning records
  const [readingRecords, meaningRecords] = await Promise.all([
    db.readingSRS.findMany({ where: whereClause }),
    db.meaningSRS.findMany({ where: whereClause })
  ]);

  const totalReadingItems = readingRecords.length;
  const totalMeaningItems = meaningRecords.length;
  const totalItems = Math.max(totalReadingItems, totalMeaningItems); // Unique vocabulary count
  
  const dueReadingItems = readingRecords.filter((r: any) => r.nextReview <= new Date()).length;
  const dueMeaningItems = meaningRecords.filter((r: any) => r.nextReview <= new Date()).length;
  const dueItems = dueReadingItems + dueMeaningItems;

  const averageEasiness = totalItems > 0 
    ? (readingRecords.reduce((sum: number, r: any) => sum + r.easiness, 0) + 
       meaningRecords.reduce((sum: number, r: any) => sum + r.easiness, 0)) / (totalReadingItems + totalMeaningItems)
    : 0;

  // Calculate average quality for both reading and meaning
  const reviewedReadingRecords = readingRecords.filter((r: any) => r.quality !== null);
  const reviewedMeaningRecords = meaningRecords.filter((r: any) => r.quality !== null);
  
  const averageReadingQuality = reviewedReadingRecords.length > 0 
    ? reviewedReadingRecords.reduce((sum: number, r: any) => sum + (r.quality || 0), 0) / reviewedReadingRecords.length
    : 0;
    
  const averageMeaningQuality = reviewedMeaningRecords.length > 0 
    ? reviewedMeaningRecords.reduce((sum: number, r: any) => sum + (r.quality || 0), 0) / reviewedMeaningRecords.length
    : 0;

  return {
    totalItems,
    dueItems,
    averageEasiness,
    averageReadingQuality,
    averageMeaningQuality
  };
} 