import { Form, useActionData, useNavigation } from "react-router";
import { useState } from "react";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const level = formData.get("level") as "N4" | "N3";
  const topic = formData.get("topic") as string;

  try {
    // Import the AI function
    const { generateLesson } = await import("../lib/ai.server");
    const { db } = await import("../lib/db.server");

    // Generate the lesson
    const generatedLesson = await generateLesson(level, topic || undefined);

    // Save to database
    const lesson = await db.lesson.create({
      data: {
        title: generatedLesson.title,
        description: generatedLesson.description,
        level: level as any,
        grammarPoints: {
          create: generatedLesson.grammarPoints.map((gp, index) => ({
            point: gp.point,
            explanation: gp.explanation,
            examples: gp.examples,
            order: index,
          })),
        },
        vocabulary: {
          create: generatedLesson.vocabulary.map((v, index) => ({
            word: v.word,
            reading: v.reading,
            meaning: v.meaning,
            example: v.example,
            order: index,
          })),
        },
        questions: {
          create: generatedLesson.questions.map((q, index) => ({
            question: q.question,
            answer: q.answer,
            options: q.options,
            type: q.type as any,
            explanation: q.explanation,
            order: index,
          })),
        },
      },
      include: {
        grammarPoints: true,
        vocabulary: true,
        questions: true,
      },
    });

    return { success: true, lessonId: lesson.id };
  } catch (error) {
    console.error("Error generating lesson:", error);
    return { success: false, error: "Failed to generate lesson" };
  }
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Japanese Learning
            <span className="text-blue-600"> AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate personalized Japanese lessons with AI-powered grammar explanations, 
            vocabulary, and practice questions for JLPT N4-N3 levels.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Generate a New Lesson
          </h2>

          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                JLPT Level
              </label>
              <select
                id="level"
                name="level"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a level</option>
                <option value="N4">N4 - Basic to Intermediate</option>
                <option value="N3">N3 - Intermediate</option>
              </select>
            </div>

            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Topic (Optional)
              </label>
              <input
                type="text"
                id="topic"
                name="topic"
                placeholder="e.g., 'te-form verbs', 'conditional sentences', 'business Japanese'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank for a general lesson, or specify a topic to focus on
              </p>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Lesson...
                </div>
              ) : (
                "Generate Lesson"
              )}
            </button>
          </Form>

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
                    Lesson Generated Successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your lesson has been created and saved to the database.</p>
                    <a
                      href={`/lessons/${actionData.lessonId}`}
                      className="font-medium underline hover:text-green-600"
                    >
                      View Lesson →
                    </a>
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
                    Error Generating Lesson
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{actionData.error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What You'll Get
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Grammar Points</h4>
              <p className="text-gray-600 text-sm">
                3-4 grammar patterns with clear explanations and example sentences
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Vocabulary</h4>
              <p className="text-gray-600 text-sm">
                8-10 essential words with readings, meanings, and example usage
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Practice Questions</h4>
              <p className="text-gray-600 text-sm">
                5 interactive questions with explanations to test your understanding
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 