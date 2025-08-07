import React, { useState, useEffect } from "react";
import Modal from "./Modal";

interface VocabularyStats {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  readingProgress: {
    quality: number | null;
    repetition: number;
    nextReview: string;
    interval: number;
  } | null;
  meaningProgress: {
    quality: number | null;
    repetition: number;
    nextReview: string;
    interval: number;
  } | null;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  userId?: string;
}

const getProgressColor = (quality: number | null, nextReview: string) => {
  if (quality === null) return "bg-gray-100 text-gray-600"; // Not reviewed
  
  const reviewDate = new Date(nextReview);
  const now = new Date();
  const isDue = reviewDate <= now;
  
  if (isDue) {
    // Due for review - use quality-based coloring
    if (quality >= 3) return "bg-yellow-100 text-yellow-800"; // Easy but due
    if (quality >= 2) return "bg-orange-100 text-orange-800"; // Good but due  
    return "bg-red-100 text-red-800"; // Hard/Don't know
  } else {
    // Future review - green for learned
    if (quality >= 2) return "bg-green-100 text-green-800"; // Learned
    return "bg-teal-100 text-teal-800"; // Learning
  }
};

const getProgressText = (quality: number | null, nextReview: string, interval: number) => {
  if (quality === null) return "Not reviewed";
  
  const reviewDate = new Date(nextReview);
  const now = new Date();
  const isDue = reviewDate <= now;
  
  if (isDue) {
    return "Due now";
  } else {
    const days = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  }
};

export default function StatsModal({ isOpen, onClose, lessonId, userId = "default-user" }: StatsModalProps) {
  const [vocabularyStats, setVocabularyStats] = useState<VocabularyStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVocabularyStats();
    }
  }, [isOpen, lessonId]);

  const loadVocabularyStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/vocabulary-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lessonId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVocabularyStats(data.vocabularyStats);
        }
      }
    } catch (error) {
      console.error('Error loading vocabulary stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vocabulary Progress"
      size="xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading vocabulary stats...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Word
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reading Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meaning Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vocabularyStats.map((vocab) => (
                  <tr key={vocab.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-lg font-medium text-gray-900 font-japanese">
                          {vocab.word}
                        </div>
                        {vocab.reading && (
                          <div className="text-sm text-gray-500 font-japanese">
                            {vocab.reading}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          {vocab.meaning}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vocab.readingProgress ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProgressColor(
                            vocab.readingProgress.quality,
                            vocab.readingProgress.nextReview
                          )}`}
                        >
                          {getProgressText(
                            vocab.readingProgress.quality,
                            vocab.readingProgress.nextReview,
                            vocab.readingProgress.interval
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Not reviewed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vocab.meaningProgress ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProgressColor(
                            vocab.meaningProgress.quality,
                            vocab.meaningProgress.nextReview
                          )}`}
                        >
                          {getProgressText(
                            vocab.meaningProgress.quality,
                            vocab.meaningProgress.nextReview,
                            vocab.meaningProgress.interval
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Not reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!isLoading && vocabularyStats.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No vocabulary found for this lesson.</div>
          </div>
        )}
      </div>
    </Modal>
  );
}