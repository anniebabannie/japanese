import { useState, useEffect } from "react";
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
        setDueItems(result.dueItems);
        setStats(result.stats);
        setCurrentIndex(0);
        setShowAnswer(false);
      } else {
        console.error("Failed to load due items:", result.error);
      }
    } catch (error) {
      console.error("Error loading due items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQualityRating = async (quality: number) => {
    if (currentIndex >= dueItems.length) return;

    setIsSubmitting(true);
    try {
      const currentItem = dueItems[currentIndex];
      const formData = new FormData();
      formData.append("vocabularyId", currentItem.vocabularyId);
      formData.append("quality", quality.toString());
      formData.append("lessonId", lessonId);
      formData.append("userId", userId);

      const response = await fetch("/api/srs-review", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Move to next item or finish
        if (currentIndex + 1 < dueItems.length) {
          setCurrentIndex(currentIndex + 1);
          setShowAnswer(false);
        } else {
          // Study session complete
          await loadDueItems(); // Refresh to get updated stats
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
  const progress = dueItems.length > 0 ? ((currentIndex + 1) / dueItems.length) * 100 : 0;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Study Vocabulary"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.dueItems}</div>
              <div className="text-sm text-gray-600">Due Today</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.averageEasiness.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Easiness</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.averageQuality.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Quality</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading vocabulary...</p>
          </div>
        ) : dueItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items due for review!</h3>
            <p className="text-gray-600">Great job! All your vocabulary is up to date.</p>
          </div>
        ) : currentItem ? (
          <div className="space-y-6">
            {/* Vocabulary Card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center">
              <div className="mb-4">
                <span className="text-sm text-gray-500">
                  {currentIndex + 1} of {dueItems.length}
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2 font-japanese">
                {currentItem.vocabulary.word}
              </h2>
              
              {currentItem.vocabulary.reading && (
                <p className="text-lg text-gray-600 mb-4 font-japanese">
                  {currentItem.vocabulary.reading}
                </p>
              )}

              {showAnswer ? (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-medium text-gray-900">
                    {currentItem.vocabulary.meaning}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAnswer(true)}
                  variant="blue"
                  className="mt-4"
                >
                  Show Answer
                </Button>
              )}
            </div>

            {/* Quality Rating Buttons */}
            {showAnswer && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">
                  How well did you know this word?
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleQualityRating(0)}
                    variant="red"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😵</span>
                    <span className="text-sm">0 - Blackout</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(1)}
                    variant="red"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😰</span>
                    <span className="text-sm">1 - Incorrect</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(2)}
                    variant="gray"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😕</span>
                    <span className="text-sm">2 - Hard</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(3)}
                    variant="blue"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😐</span>
                    <span className="text-sm">3 - Good</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(4)}
                    variant="green"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😊</span>
                    <span className="text-sm">4 - Easy</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleQualityRating(5)}
                    variant="green"
                    disabled={isSubmitting}
                    className="flex flex-col items-center p-4"
                  >
                    <span className="text-2xl mb-1">😄</span>
                    <span className="text-sm">5 - Perfect</span>
                  </Button>
                </div>
              </div>
            )}

            {/* SRS Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">SRS Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Repetition:</span>
                  <span className="ml-2 font-medium">{currentItem.repetition}</span>
                </div>
                <div>
                  <span className="text-gray-600">Easiness:</span>
                  <span className="ml-2 font-medium">{currentItem.easiness.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Interval:</span>
                  <span className="ml-2 font-medium">{currentItem.interval} days</span>
                </div>
                <div>
                  <span className="text-gray-600">Next Review:</span>
                  <span className="ml-2 font-medium">
                    {new Date(currentItem.nextReview).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
} 