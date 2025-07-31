import { Form, useActionData, useNavigation, useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Button from "~/components/Button";
import Modal from "~/components/Modal";
import StudyModal from "~/components/StudyModal";
import StoryText from "~/components/StoryText";

export async function loader({ params }: { params: { id: string } }) {
  const { db } = await import("../lib/db.server");
  
  const lesson = await db.lesson.findUnique({
    where: { id: params.id },
    include: {
      grammarPoints: { orderBy: { order: 'asc' } },
      vocabulary: { orderBy: { order: 'asc' } },
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!lesson) {
    throw new Response("Lesson not found", { status: 404 });
  }

  return { lesson };
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "generate-more-questions") {
    try {
      const { db } = await import("../lib/db.server");
      const { generateAdditionalQuestions } = await import("../lib/ai.server");

      // Get the lesson data first
      const lesson = await db.lesson.findUnique({
        where: { id: params.id },
        include: {
          grammarPoints: { orderBy: { order: 'asc' } },
          vocabulary: { orderBy: { order: 'asc' } },
        },
      });

      if (!lesson) {
        return { success: false, error: "Lesson not found" };
      }

      // Delete all existing questions for this lesson
      await db.question.deleteMany({
        where: { lessonId: params.id },
      });

      // Transform vocabulary to match the interface
      const vocabularyForAI = lesson.vocabulary.map(v => ({
        word: v.word,
        reading: v.reading || undefined,
        meaning: v.meaning,
      }));

      // Generate completely new questions
      const newQuestions = await generateAdditionalQuestions(
        params.id,
        [], // Empty array since we're starting fresh
        {
          story: lesson.story,
          grammarPoints: lesson.grammarPoints,
          vocabulary: vocabularyForAI,
          level: lesson.level,
        },
        5 // Generate 5 new questions
      );

      // Save new questions
      const savedQuestions = await Promise.all(
        newQuestions.map((q, index) =>
          db.question.create({
            data: {
              lessonId: params.id,
              question: q.question,
              answer: q.answer,
              options: q.options,
              type: q.type as any,
              explanation: q.explanation,
              order: index,
            },
          })
        )
      );

      // Get the updated lesson with new questions
      const updatedLesson = await db.lesson.findUnique({
        where: { id: params.id },
        include: {
          grammarPoints: { orderBy: { order: 'asc' } },
          vocabulary: { orderBy: { order: 'asc' } },
          questions: { orderBy: { order: 'asc' } },
        },
      });

      return { success: true, questions: savedQuestions, updatedLesson };
    } catch (error) {
      console.error("Error generating new questions:", error);
      return { success: false, error: "Failed to generate new questions" };
    }
  }



  return { success: false, error: "Invalid action" };
}

export default function LessonView() {
  const { lesson: initialLesson } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";
  
  // Use state to manage lesson data so we can update it dynamically
  const [lesson, setLesson] = useState(initialLesson);

  // Update lesson data when new questions are generated
  useEffect(() => {
    if (actionData?.success && actionData?.updatedLesson) {
      setLesson(actionData.updatedLesson);
      // Clear user answers and results since question IDs have changed
      setUserAnswers({});
      setSelectedOptions({});
      setCheckResults({});
      setShowAnswers({});
    }
  }, [actionData]);

  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [checkResults, setCheckResults] = useState<Record<string, { correct: boolean; message: string }>>({});
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isLookingUpWord, setIsLookingUpWord] = useState(false);
  const [highlightedVocabId, setHighlightedVocabId] = useState<string | null>(null);
  const [highlightedWordInStory, setHighlightedWordInStory] = useState<string | null>(null);
  const [expandedGrammarPoints, setExpandedGrammarPoints] = useState<Record<string, boolean>>({});

  const toggleAnswer = (questionId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const toggleGrammarExplanation = (grammarPointId: string) => {
    setExpandedGrammarPoints(prev => ({
      ...prev,
      [grammarPointId]: !prev[grammarPointId],
    }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleOptionSelect = (questionId: string, option: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const checkAnswer = (questionId: string) => {
    const question = lesson.questions.find(q => q.id === questionId);
    if (!question) return;

    let isCorrect = false;
    let message = "";

    if (question.type === 'MULTIPLE_CHOICE') {
      const selected = selectedOptions[questionId];
      isCorrect = selected === question.answer;
      message = isCorrect ? "正解です！" : "不正解です。正しい答えを確認してください。";
    } else {
      const userAnswer = userAnswers[questionId]?.trim().toLowerCase();
      const correctAnswer = question.answer.trim().toLowerCase();
      isCorrect = userAnswer === correctAnswer;
      message = isCorrect ? "正解です！" : "不正解です。正しい答えを確認してください。";
    }

    setCheckResults(prev => ({
      ...prev,
      [questionId]: { correct: isCorrect, message },
    }));
  };

  const handleWordSelected = async (word: string) => {
    setSelectedWord(word);
    setIsLookingUpWord(true);
    
    try {
      // Look up the word using the LLM
      const response = await fetch('/api/lookup-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if the word already exists in the vocabulary list
        const existingWord = lesson.vocabulary.find(vocab => 
          vocab.word === data.word || 
          vocab.reading === data.reading ||
          vocab.meaning.toLowerCase().includes(data.meaning.toLowerCase()) ||
          data.meaning.toLowerCase().includes(vocab.meaning.toLowerCase())
        );
        
        if (existingWord) {
          const shouldAdd = confirm(
            `"${data.word}" appears to already be in your vocabulary list.\n\n` +
            `Existing: ${existingWord.word} (${existingWord.reading || 'no reading'}) - ${existingWord.meaning}\n` +
            `New: ${data.word} (${data.reading || 'no reading'}) - ${data.meaning}\n\n` +
            `Do you still want to add it?`
          );
          
          if (!shouldAdd) {
            setIsLookingUpWord(false);
            setSelectedWord(null);
            return;
          }
        }
        
        // Add the word to the lesson's vocabulary
        const addResponse = await fetch('/api/add-vocabulary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            word: data.word,
            reading: data.reading,
            meaning: data.meaning,
            originalForm: data.originalForm,
            conjugationInfo: data.conjugationInfo,
          }),
        });
        
        if (addResponse.ok) {
          const addData = await addResponse.json();
          
          // Add the new vocabulary to the lesson state (at the top)
          const updatedLesson = {
            ...lesson,
            vocabulary: [addData.vocabulary, ...lesson.vocabulary]
          };
          setLesson(updatedLesson);
          
          // Highlight the new vocabulary word
          setHighlightedVocabId(addData.vocabulary.id);
          
          // Scroll the vocabulary list to the top
          setTimeout(() => {
            const vocabContainer = document.querySelector('[data-section="vocabulary"] .max-h-150') as HTMLElement;
            if (vocabContainer) {
              vocabContainer.scrollTop = 0;
            }
          }, 100); // Small delay to ensure the DOM is updated
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedVocabId(null);
          }, 3000);
        } else {
          alert('Failed to add word to vocabulary');
        }
      } else {
        alert('Failed to look up word');
      }
    } catch (error) {
      console.error('Error looking up word:', error);
      alert('Error looking up word');
    } finally {
      setIsLookingUpWord(false);
      setSelectedWord(null);
    }
  };

  const handleDeleteVocabulary = async (vocabularyId: string) => {
    if (confirm('Are you sure you want to delete this vocabulary word?')) {
      try {
        const response = await fetch(`/api/delete-vocabulary?id=${vocabularyId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // Refresh the page to show the updated vocabulary list
          window.location.reload();
        } else {
          alert('Failed to delete vocabulary word');
        }
      } catch (error) {
        console.error('Error deleting vocabulary:', error);
        alert('Error deleting vocabulary word');
      }
    }
  };

  const handleVocabularyWordClick = (vocab: any) => {
    const wordToHighlight = vocab.originalForm || vocab.word;
    
    // If this word is already highlighted, unhighlight it
    if (highlightedWordInStory === wordToHighlight) {
      setHighlightedWordInStory(null);
    } else {
      // Highlight this word
      setHighlightedWordInStory(wordToHighlight);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <div className="mb-6">
            <a
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Lessons
            </a>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <div className="flex items-center space-x-4 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      JLPT {lesson.level}
                    </span>
                  </div>
                  <p className="text-gray-600">{lesson.description}</p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
                        // Delete the lesson
                        fetch(`/api/delete-lesson?id=${lesson.id}`, {
                          method: 'DELETE',
                        }).then(response => {
                          console.log('Delete response:', response);
                          if (response.ok) {
                            return response.json();
                          } else {
                            console.error('Delete failed:', response.status, response.statusText);
                            alert('Failed to delete lesson');
                            throw new Error('Delete failed');
                          }
                        }).then(data => {
                          if (data.success) {
                            window.location.href = '/';
                          } else {
                            alert(data.error || 'Failed to delete lesson');
                          }
                        }).catch(error => {
                          console.error('Error deleting lesson:', error);
                          alert('Failed to delete lesson');
                        });
                      }
                    }}
                    variant="red"
                    size="sm"
                    className="inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  Created on {new Date(lesson.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Story/Article */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Story</h2>
                {isLookingUpWord && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800">Looking up "{selectedWord}"...</p>
                  </div>
                )}
                <StoryText 
                  text={lesson.story} 
                  onWordSelected={handleWordSelected} 
                  highlightedWord={highlightedWordInStory}
                />
              </div>

              {/* Grammar Points */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Grammar Points</h2>
                  <Button
                    onClick={async () => {
                      if (confirm('Are you sure you want to regenerate the grammar points? This will replace all existing grammar explanations with more detailed ones.')) {
                        try {
                          const response = await fetch('/api/regenerate-grammar', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ lessonId: lesson.id }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            if (data.success) {
                              // Update the lesson state with new grammar points
                              const updatedLesson = {
                                ...lesson,
                                grammarPoints: data.grammarPoints
                              };
                              setLesson(updatedLesson);
                              alert('Grammar points regenerated successfully!');
                            } else {
                              alert(data.error || 'Failed to regenerate grammar points');
                            }
                          } else {
                            alert('Failed to regenerate grammar points');
                          }
                        } catch (error) {
                          console.error('Error regenerating grammar points:', error);
                          alert('Error regenerating grammar points');
                        }
                      }
                    }}
                    variant="blue"
                    size="sm"
                    className="inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </Button>
                </div>
                <div className="space-y-6">
                  {lesson.grammarPoints.map((grammarPoint, index) => (
                    <div key={grammarPoint.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {index + 1}. {grammarPoint.point}
                        </h3>
                        <Button
                          onClick={() => toggleGrammarExplanation(grammarPoint.id)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {expandedGrammarPoints[grammarPoint.id] ? "Hide Explanation" : "Show Explanation"}
                        </Button>
                      </div>
                      
                      {expandedGrammarPoints[grammarPoint.id] && (
                        <>
                          <div className="text-gray-700 mb-3 prose prose-sm max-w-none [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>h1]:mb-3 [&>h2]:mb-3 [&>h3]:mb-3 [&>h4]:mb-3 [&>h5]:mb-3 [&>h6]:mb-3">
                            <ReactMarkdown>{grammarPoint.explanation}</ReactMarkdown>
                          </div>
                          <div className="bg-gray-50 rounded-md p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Examples:</h4>
                            <ul className="space-y-2">
                              {grammarPoint.examples.map((example, i) => (
                                <li key={i} className="text-gray-700 font-japanese">
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice Questions */}
              <div className="bg-white rounded-lg shadow-sm p-6" data-section="questions">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Practice Questions</h2>
                  <Form method="post">
                    <input type="hidden" name="action" value="generate-more-questions" />
                    <Button
                      type="submit"
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Generating..." : "Generate New Questions"}
                    </Button>
                  </Form>
                </div>

                <div className="space-y-6">
                  {lesson.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 font-japanese">
                          問題 {index + 1}
                        </h3>
                        <span className="text-sm text-gray-500 capitalize">
                          {question.type === 'MULTIPLE_CHOICE' ? '選択問題' : 
                           question.type === 'FILL_IN_BLANK' ? '空欄補充' : '翻訳問題'}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-4 font-japanese">{question.question}</p>

                      {question.type === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-japanese">正しい答えを選んでください：</p>
                          {question.options.map((option, i) => (
                            <div key={i} className="flex items-center">
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                id={`option-${question.id}-${i}`}
                                className="mr-3"
                                checked={selectedOptions[question.id] === option}
                                onChange={() => handleOptionSelect(question.id, option)}
                              />
                              <label htmlFor={`option-${question.id}-${i}`} className="text-gray-700 font-japanese">
                                {String.fromCharCode(65 + i)}. {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'FILL_IN_BLANK' && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-japanese">空欄に適切な言葉を入れてください：</p>
                          <input
                            type="text"
                            placeholder="答えを入力してください"
                            value={userAnswers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-japanese"
                          />
                        </div>
                      )}

                      {question.type === 'TRANSLATION' && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-japanese">日本語に翻訳してください：</p>
                          <textarea
                            placeholder="翻訳を入力してください"
                            rows={3}
                            value={userAnswers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-japanese"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-4">
                        <Button
                          onClick={() => checkAnswer(question.id)}
                          variant="green"
                          size="sm"
                        >
                          答えをチェック
                        </Button>
                        <Button
                          onClick={() => toggleAnswer(question.id)}
                          variant="ghost"
                          size="sm"
                        >
                          {showAnswers[question.id] ? "答えを隠す" : "答えを見る"}
                        </Button>
                      </div>

                      {checkResults[question.id] && (
                        <div className={`mt-4 p-4 rounded-md ${
                          checkResults[question.id].correct 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`font-medium ${
                            checkResults[question.id].correct ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {checkResults[question.id].message}
                          </p>
                        </div>
                      )}

                      {showAnswers[question.id] && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-md">
                          <p className="text-gray-900 font-medium font-japanese">答え: {question.answer}</p>
                          {question.explanation && (
                            <p className="text-gray-700 mt-2 text-sm">{question.explanation}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {actionData?.success && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          New Questions Generated!
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>5 new practice questions have been generated for this lesson.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {actionData?.error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error Generating Questions
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{actionData.error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vocabulary Sidebar */}
            <div className="lg:col-span-1" data-section="vocabulary">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Vocabulary</h2>
                  <Button
                    onClick={() => setIsStudyModalOpen(true)}
                    variant="green"
                    size="sm"
                    className="inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Study
                  </Button>
                </div>
                <div className="max-h-150 overflow-y-auto space-y-4 pr-2">
                  {lesson.vocabulary.map((vocab, index) => (
                    <div 
                      key={vocab.id} 
                      data-vocab-id={vocab.id}
                      className={`border rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm transition-shadow ${
                        highlightedVocabId === vocab.id 
                          ? 'border-green-500 bg-green-50 shadow-lg transition-all duration-500' 
                          : highlightedWordInStory === (vocab.originalForm || vocab.word)
                          ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 
                            className="text-lg font-medium text-gray-900 font-japanese cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => handleVocabularyWordClick(vocab)}
                            title="Click to highlight this word in the story"
                          >
                            {vocab.word}
                          </h3>
                          {vocab.reading && (
                            <p className="text-sm text-gray-600 font-japanese">
                              {vocab.reading}
                            </p>
                          )}
                          <p className="text-gray-700 mt-1">{vocab.meaning}</p>
                          {vocab.conjugationInfo && (
                            <p className="text-xs text-blue-600 mt-1">
                              {vocab.originalForm} → {vocab.conjugationInfo}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteVocabulary(vocab.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 cursor-pointer"
                          title="Delete vocabulary word"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Study Modal */}
        <StudyModal
          isOpen={isStudyModalOpen}
          onClose={() => setIsStudyModalOpen(false)}
          lessonId={lesson.id}
        />

      </div>
  );
} 