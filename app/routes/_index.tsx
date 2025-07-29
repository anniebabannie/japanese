import { useLoaderData } from "react-router";
import { db } from "../lib/db.server";

export async function loader() {
  try {
    const lessons = await db.lesson.findMany({
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
    
    // Debug logging
    console.log("Generated lesson:", {
      title: generatedLesson.title,
      description: generatedLesson.description,
      story: generatedLesson.story,
      grammarPointsCount: generatedLesson.grammarPoints.length,
      vocabularyCount: generatedLesson.vocabulary.length,
      questionsCount: generatedLesson.questions.length,
    });

    // Save to database
    const lesson = await db.lesson.create({
      data: {
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

export default function Index() {
  const { lessons } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Lessons Grid */}
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            Available Lessons
          </h3>
          
          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No lessons available yet</p>
              <p className="text-gray-400 text-sm mt-2">Generate your first lesson using the button in the navigation!</p>
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