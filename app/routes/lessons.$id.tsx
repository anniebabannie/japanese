import { Form, useActionData, useNavigation, useLoaderData } from "react-router";
import { useState } from "react";

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

      // Get existing questions
      const existingQuestions = await db.question.findMany({
        where: { lessonId: params.id },
        orderBy: { order: 'asc' },
      });

      // Generate additional questions
      const newQuestions = await generateAdditionalQuestions(
        params.id,
        existingQuestions.map(q => ({
          question: q.question,
          answer: q.answer,
          options: q.options,
          type: q.type as any,
          explanation: q.explanation || undefined,
        })),
        3
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
              order: existingQuestions.length + index,
            },
          })
        )
      );

      return { success: true, questions: savedQuestions };
    } catch (error) {
      console.error("Error generating additional questions:", error);
      return { success: false, error: "Failed to generate additional questions" };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function LessonView() {
  const { lesson } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";

  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [checkResults, setCheckResults] = useState<Record<string, { correct: boolean; message: string }>>({});

  const toggleAnswer = (questionId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
              <p className="text-gray-600 mt-2">{lesson.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                JLPT {lesson.level}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Created on {new Date(lesson.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Grammar Points */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Grammar Points</h2>
          <div className="space-y-6">
            {lesson.grammarPoints.map((grammarPoint, index) => (
              <div key={grammarPoint.id} className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {index + 1}. {grammarPoint.point}
                </h3>
                <p className="text-gray-700 mb-3">{grammarPoint.explanation}</p>
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
              </div>
            ))}
          </div>
        </div>

        {/* Vocabulary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vocabulary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lesson.vocabulary.map((vocab, index) => (
              <div key={vocab.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 font-japanese">
                      {vocab.word}
                    </h3>
                    {vocab.reading && (
                      <p className="text-sm text-gray-600 font-japanese">
                        {vocab.reading}
                      </p>
                    )}
                    <p className="text-gray-700 mt-1">{vocab.meaning}</p>
                    {vocab.example && (
                      <div className="mt-2 text-sm text-gray-600 font-japanese">
                        <span className="font-medium">Example:</span> {vocab.example}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Practice Questions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Practice Questions</h2>
            <Form method="post">
              <input type="hidden" name="action" value="generate-more-questions" />
              <button
                type="submit"
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {isGenerating ? "Generating..." : "Generate More Questions"}
              </button>
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
                  <button
                    onClick={() => checkAnswer(question.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    答えをチェック
                  </button>
                  <button
                    onClick={() => toggleAnswer(question.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showAnswers[question.id] ? "答えを隠す" : "答えを見る"}
                  </button>
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
                    Additional Questions Generated!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>3 new practice questions have been added to this lesson.</p>
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

        {/* Back to Home */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
} 