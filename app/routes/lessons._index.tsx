import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { db } from "../lib/db.server";
import { requireAuth } from "../lib/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  // Require authentication - will redirect to sign-in if not authenticated
  const userId = await requireAuth(args);
  
  try {
    const lessons = await db.lesson.findMany({
      where: {
        userId: userId,
      },
      include: {
        grammarPoints: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { lessons };
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return { lessons: [] };
  }
}

export async function action(args: ActionFunctionArgs) {
  // Require authentication for lesson creation
  const userId = await requireAuth(args);
  
  const formData = await args.request.formData();
  const level = formData.get("level") as "N4" | "N3";
  const topic = formData.get("topic") as string;

  try {
    // Import the AI function
    const { generateLesson } = await import("../lib/ai.server");
    const { db } = await import("../lib/db.server");

    // Generate the lesson
    const generatedLesson = await generateLesson(level, topic || undefined);
    
    // Debug logging
    console.log("Generated lesson:", {
      title: generatedLesson.title,
      description: generatedLesson.description,
      story: generatedLesson.story,
      grammarPointsCount: generatedLesson.grammarPoints.length,
      vocabularyCount: generatedLesson.vocabulary.length,
      questionsCount: generatedLesson.questions.length,
    });

    // Save to database with current user
    const lesson = await db.lesson.create({
      data: {
        userId: userId,
        title: generatedLesson.title,
        description: generatedLesson.description,
        story: generatedLesson.story,
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

export default function LessonsIndex() {
  const { lessons } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            My Japanese Lessons
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Your personalized AI-generated lessons for JLPT preparation
          </p>
        </div>

        {/* Lessons Grid */}
        {lessons.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No lessons yet</h3>
            <p className="text-gray-500 text-sm mt-2">Create your first lesson to get started!</p>
            <div className="mt-6">
              <a
                href="/generate-lesson"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 -ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate First Lesson
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <a
                      href={`/lessons/${lesson.id}`}
                      className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors flex-1 mr-3"
                    >
                      {lesson.title}
                    </a>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                      lesson.level === 'N4' 
                        ? 'bg-blue-100 text-blue-800' 
                        : lesson.level === 'N3'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {lesson.level}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {lesson.description}
                  </p>
                  
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Grammar Points:</h5>
                    <ul className="space-y-1">
                      {lesson.grammarPoints.map((grammarPoint) => (
                        <li key={grammarPoint.id} className="text-sm text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{grammarPoint.point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(lesson.createdAt).toLocaleDateString()}
                    </span>
                    <a
                      href={`/lessons/${lesson.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      View Lesson
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}