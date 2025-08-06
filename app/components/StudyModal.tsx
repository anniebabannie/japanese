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
  const [stats, setStats] = useState<SRSStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studyMode, setStudyMode] = useState<'reading' | 'meaning'>('reading');
  const [qualityRating, setQualityRating] = useState<number | null>(null);
  const [allDueItems, setAllDueItems] = useState<SRSRecord[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Separate decks and progress for each study mode
  const [readingItems, setReadingItems] = useState<SRSRecord[]>([]);
  const [meaningItems, setMeaningItems] = useState<SRSRecord[]>([]);
  const [readingIndex, setReadingIndex] = useState(0);
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [readingShowAnswer, setReadingShowAnswer] = useState(false);
  const [meaningShowAnswer, setMeaningShowAnswer] = useState(false);


  // Load due items when modal opens or lesson changes
  useEffect(() => {
    if (isOpen) {
      loadDueItems();
    } else {
      // Reset states when modal closes
      setSessionStarted(false);
      setReadingItems([]);
      setMeaningItems([]);
      setReadingIndex(0);
      setMeaningIndex(0);
      setReadingShowAnswer(false);
      setMeaningShowAnswer(false);
    }
  }, [isOpen, lessonId]);

  // Add a function to refresh data (useful when new words are added)
  const refreshVocabulary = () => {
    loadDueItems();
  };

  // Get current deck and progress based on study mode
  const currentDeck = studyMode === 'reading' ? readingItems : meaningItems;
  const currentIndex = studyMode === 'reading' ? readingIndex : meaningIndex;
  const currentShowAnswer = studyMode === 'reading' ? readingShowAnswer : meaningShowAnswer;

  const loadDueItems = async (isSessionActive = false) => {
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
          // Store separate reading and meaning items
          setReadingItems(result.readingItems || []);
          setMeaningItems(result.meaningItems || []);
          setStats(result.stats);
          setSessionStarted(true);
          
        } else {
          console.error("Failed to load due items:", result.error);
        }
    } catch (error) {
      console.error("Error loading due items:", error);
    } finally {
      setIsLoading(false);
    }
  };

    const restartStudy = async () => {
    try {
      // Load ALL vocabulary for the lesson (not just due items)
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("lessonId", lessonId);
      formData.append("includeAll", "true");

      const response = await fetch("/api/srs-progress", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
        
        // Only reset the current study mode's deck
        if (studyMode === 'reading') {
          setReadingItems(result.readingItems || []);
          setReadingIndex(0);
          setReadingShowAnswer(false);
        } else {
          setMeaningItems(result.meaningItems || []);
          setMeaningIndex(0);
          setMeaningShowAnswer(false);
        }
      }
      
      // Reset only current mode state
      setQualityRating(null);
      setSessionStarted(false);
    } catch (error) {
      console.error("Error restarting study:", error);
    }
  };

  const handleQualityRating = async (quality: number) => {
    if (currentIndex >= currentDeck.length) return;

    setIsSubmitting(true);
    try {
      const currentItem = currentDeck[currentIndex];
      const formData = new FormData();
      formData.append("vocabularyId", currentItem.vocabularyId);
      formData.append("studyMode", studyMode);
      formData.append("quality", quality.toString());
      formData.append("lessonId", lessonId);
      formData.append("userId", userId);

      const response = await fetch("/api/srs-review", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      
              if (result.success) {
          // Use the updated due items from the API response
          const newDueItems = result.updatedDueItems || [];
          
          // Move to next item or check if session is complete
          if (currentIndex + 1 < currentDeck.length) {
            // Update the appropriate index based on study mode
            if (studyMode === 'reading') {
              setReadingIndex(readingIndex + 1);
              setReadingShowAnswer(false);
            } else {
              setMeaningIndex(meaningIndex + 1);
              setMeaningShowAnswer(false);
            }
            setQualityRating(null);
          } else {
            // End of current round - check if there are more items to review
            console.log('End of round, checking for more items:', newDueItems.length);
            
            if (newDueItems.length > 0) {
              // Start a new round with items that need re-review for this mode
              if (studyMode === 'reading') {
                setReadingItems(newDueItems);
                setReadingIndex(0);
                setReadingShowAnswer(false);
              } else {
                setMeaningItems(newDueItems);
                setMeaningIndex(0);
                setMeaningShowAnswer(false);
              }
              setQualityRating(null);
              setSessionStarted(true);
            } else {
              // No more items to review for this mode - clear current deck to show completion
              if (studyMode === 'reading') {
                setReadingItems([]);
              } else {
                setMeaningItems([]);
              }
            }
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

  // Get current item and progress
  const currentItem = currentDeck[currentIndex];
  const isLastItem = currentIndex === currentDeck.length - 1;
  // Progress advances when user has rated the current card (showAnswer is true)
  const progress = currentDeck.length > 0 ? ((currentIndex + (currentShowAnswer ? 1 : 0)) / currentDeck.length) * 100 : 0;

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen || !currentItem) return;
      
      if (event.key === 'Enter' && !currentShowAnswer) {
        if (studyMode === 'reading') {
          setReadingShowAnswer(true);
        } else {
          setMeaningShowAnswer(true);
        }
      }
      
      // Handle number keys for rating when answer is shown
      if (currentShowAnswer && !isSubmitting) {
        const rating = parseInt(event.key);
        if (rating >= 0 && rating <= 3) {
          handleQualityRating(rating);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, currentItem, currentShowAnswer, isSubmitting, studyMode]);

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
        ) : currentDeck.length === 0 ? (
          <div className="space-y-6 flex-1 flex flex-col">
            {/* Study Mode Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setStudyMode('reading')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  studyMode === 'reading'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reading
              </button>
              <button
                onClick={() => setStudyMode('meaning')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  studyMode === 'meaning'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Meaning
              </button>
            </div>

            {/* Completion Content */}
            <div className="text-center py-8 flex-1 flex flex-col justify-center">
              <div className="text-6xl mb-4">{sessionStarted ? '🎉' : '✅'}</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {sessionStarted ? 'Congratulations!' : `All caught up with ${studyMode}!`}
              </h3>
              <p className="text-gray-600 mb-6">
                {sessionStarted 
                  ? `You've completed all ${studyMode} reviews!`
                  : `No ${studyMode} reviews are due right now. Try the other tab or come back later when items are scheduled for review.`
                }
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={restartStudy}
                  variant="blue"
                >
                  Review Again
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                >
                  Close
                </Button>
              </div>
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
                  {currentIndex + 1} of {currentDeck.length}
                </span>
              </div>
              
              {studyMode === 'reading' ? (
                // Reading mode: show word, test reading
                <>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 font-japanese">
                    {currentItem.vocabulary.word}
                  </h2>
                  {currentShowAnswer && currentItem.vocabulary.reading && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-medium text-gray-900 font-japanese">
                        {currentItem.vocabulary.reading}
                      </p>
                    </div>
                  )}
                  {!currentShowAnswer && (
                    <Button
                      onClick={() => studyMode === 'reading' ? setReadingShowAnswer(true) : setMeaningShowAnswer(true)}
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
                  {currentShowAnswer && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-lg font-medium text-gray-900">
                        {currentItem.vocabulary.meaning}
                      </p>
                    </div>
                  )}
                  {!currentShowAnswer && (
                    <Button
                      onClick={() => setMeaningShowAnswer(true)}
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
            {currentShowAnswer && (
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