import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface Vocabulary {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
}

interface SRSRecord {
  id: string;
  vocabularyId: string;
  lessonId: string;
  repetition: number;
  easiness: number;
  interval: number;
  nextReview: string;
  quality: number | null;
  vocabulary: Vocabulary;
}

interface SRSStats {
  totalItems: number;
  dueItems: number;
  averageEasiness: number;
  averageQuality: number;
}

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  userId?: string;
}

export default function StudyModal({ isOpen, onClose, lessonId, userId = "default-user" }: StudyModalProps) {
  const [dueItems, setDueItems] = useState<SRSRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState<SRSStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studyMode, setStudyMode] = useState<'reading' | 'meaning'>('reading');
  const [qualityRating, setQualityRating] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [originalItems, setOriginalItems] = useState<SRSRecord[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Load due items when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDueItems();
    }
  }, [isOpen, lessonId]);

  const loadDueItems = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("lessonId", lessonId);

      const response = await fetch("/api/srs-progress", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
              if (result.success) {
          // If no due items, automatically include all vocabulary
          if (result.dueItems.length === 0) {
            formData.set("includeAll", "true");
            const allResponse = await fetch("/api/srs-progress", {
              method: "POST",
              body: formData
            });
            const allResult = await allResponse.json();
            if (allResult.success) {
              setDueItems(allResult.dueItems);
              setOriginalItems(allResult.dueItems);
              setStats(allResult.stats);
            }
          } else {
            setDueItems(result.dueItems);
            setOriginalItems(result.dueItems);
            setStats(result.stats);
          }
          setCurrentIndex(0);
          setShowAnswer(false);
          setSessionStarted(true);
          
          // Check if we've completed the session (no more items to review)
          // Only show completion if we had original items and now have none due
          if (result.dueItems.length === 0 && sessionStarted) {
            setIsCompleted(true);
            setSessionCompleted(true);
          } else {
            setIsCompleted(false);
            setSessionCompleted(false);
          }
        } else {
          console.error("Failed to load due items:", result.error);
        }
    } catch (error) {
      console.error("Error loading due items:", error);
    } finally {
      setIsLoading(false);
    }
  };

    const restartStudy = () => {
    setDueItems(originalItems);
    setCurrentIndex(0);
    setShowAnswer(false);
    setQualityRating(null);
    setIsCompleted(false);
    setSessionCompleted(false);
    setSessionStarted(false);
  };

  const handleQualityRating = async (quality: number) => {
    if (currentIndex >= dueItems.length) return;

    setIsSubmitting(true);
    try {
      const currentItem = dueItems[currentIndex];
      const formData = new FormData();
      formData.append("vocabularyId", currentItem.vocabularyId);
      
      // Set the rating for the current study mode, and use a default for the other
      if (studyMode === 'reading') {
        formData.append("readingQuality", quality.toString());
        formData.append("meaningQuality", "3"); // Default to "easy" for meaning
      } else {
        formData.append("readingQuality", "3"); // Default to "easy" for reading
        formData.append("meaningQuality", quality.toString());
      }
      
      formData.append("lessonId", lessonId);
      formData.append("userId", userId);

      const response = await fetch("/api/srs-review", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
              if (result.success) {
          // Move to next item or check if session is complete
          if (currentIndex + 1 < dueItems.length) {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
            setQualityRating(null);
          } else {
            // Check if this was the final round (all items rated Good or Easy)
            // We're done when we finish a round and there are no more items to re-review
            // The server will return only items that need re-review (rated 0 or 1)
            await loadDueItems(); // Refresh to get updated stats
            // If loadDueItems returns no items, it means all items were rated Good or Easy
            // We'll check this in the next render cycle
          }
        } else {
          console.error("Failed to submit review:", result.error);
        }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentItem = dueItems[currentIndex];
  const isLastItem = currentIndex === dueItems.length - 1;
  // Progress advances when user has rated the current card (showAnswer is true)
  const progress = dueItems.length > 0 ? ((currentIndex + (showAnswer ? 1 : 0)) / dueItems.length) * 100 : 0;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Study Vocabulary"
      size="lg"
    >
      <div className="space-y-6 min-h-[500px] flex flex-col">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>



        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading vocabulary...</p>
          </div>
        ) : dueItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No vocabulary found!</h3>
            <p className="text-gray-600">This lesson doesn't have any vocabulary to study. Please try refreshing the page.</p>
          </div>
        ) : (isCompleted && sessionCompleted) ? (
          <div className="text-center py-8 flex-1 flex flex-col justify-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Congratulations!</h3>
            <p className="text-gray-600 mb-6">You've mastered all {originalItems.length} vocabulary items for {studyMode}!</p>
            <div className="space-y-3">
              <Button
                onClick={restartStudy}
                variant="blue"
                className="w-full"
              >
                Review Again
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        ) : currentItem ? (
          <div className="space-y-6 flex-1 flex flex-col">


            {/* Study Mode Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setStudyMode('reading')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  studyMode === 'reading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Reading
              </button>
              <button
                onClick={() => setStudyMode('meaning')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  studyMode === 'meaning'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Meaning
              </button>
            </div>

            {/* Vocabulary Card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center flex-1 flex flex-col justify-center min-h-[300px]">
              <div className="mb-4">
                <span className="text-sm text-gray-500">
                  {currentIndex + 1} of {dueItems.length}
                </span>
              </div>
              
              {studyMode === 'reading' ? (
                // Reading mode: show word, test reading
                <>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 font-japanese">
                    {currentItem.vocabulary.word}
                  </h2>
                  {showAnswer && currentItem.vocabulary.reading && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-medium text-gray-900 font-japanese">
                        {currentItem.vocabulary.reading}
                      </p>
                    </div>
                  )}
                  {!showAnswer && (
                    <Button
                      onClick={() => setShowAnswer(true)}
                      variant="blue"
                      className="mt-4 mx-auto"
                    >
                      Show Reading
                    </Button>
                  )}
                </>
              ) : (
                // Meaning mode: show word and reading, test meaning
                <>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 font-japanese">
                    {currentItem.vocabulary.word}
                  </h2>
                  {currentItem.vocabulary.reading && (
                    <p className="text-lg text-gray-600 mb-4 font-japanese">
                      {currentItem.vocabulary.reading}
                    </p>
                  )}
                  {showAnswer && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-medium text-gray-900">
                        {currentItem.vocabulary.meaning}
                      </p>
                    </div>
                  )}
                  {!showAnswer && (
                    <Button
                      onClick={() => setShowAnswer(true)}
                      variant="blue"
                      className="mt-4 mx-auto"
                    >
                      Show Meaning
                    </Button>
                    )}
                </>
              )}
            </div>

            {/* Quality Rating Buttons - Only show after answer is revealed */}
            {showAnswer && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">
                  How well did you know the {studyMode}?
                </h3>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleQualityRating(0)}
                    variant="red"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    0 - Didn't know
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(1)}
                    variant="gray"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    1 - Hard
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(2)}
                    variant="blue"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    2 - Good
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(3)}
                    variant="green"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    3 - Easy
                  </Button>
                </div>
              </div>
            )}


          </div>
        ) : null}
      </div>
    </Modal>
  );
} 