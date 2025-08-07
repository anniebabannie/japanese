import { db } from "../lib/db.server";
import { generateLesson } from "../lib/ai.server";
import { requireAuth } from "../lib/auth.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function loader(args: LoaderFunctionArgs) {
  // Require authentication for accessing the generate lesson page
  await requireAuth(args);
  return {};
}

export async function action(args: ActionFunctionArgs) {
  // Require authentication for lesson generation
  const userId = await requireAuth(args);
  
  const formData = await args.request.formData();
  const level = formData.get("level") as "N4" | "N3";
  const topic = formData.get("topic") as string;

  try {
    const generatedLesson = await generateLesson(level, topic || undefined);
    
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

export default function GenerateLesson() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Generate New Lesson
            </h1>
            <p className="text-gray-600">
              Create a personalized Japanese lesson with AI-generated content
            </p>
          </div>

          <form method="post" className="space-y-6">
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                JLPT Level <span className="text-red-500">*</span>
              </label>
              <select
                id="level"
                name="level"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                Leave blank for a general lesson, or specify a topic to focus on
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <a
                href="/lessons"
                className="flex-1 px-6 py-3 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </a>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Generate Lesson
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}