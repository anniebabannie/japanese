import { db } from "../lib/db.server";
import { generateLesson } from "../lib/ai.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const level = formData.get("level") as "N4" | "N3";
  const topic = formData.get("topic") as string;

  try {
    const generatedLesson = await generateLesson(level, topic || undefined);
    
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