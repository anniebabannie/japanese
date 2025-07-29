import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GrammarPoint {
  point: string;
  explanation: string;
  examples: string[];
}

export interface Vocabulary {
  word: string;
  reading?: string;
  meaning: string;
}

export interface Question {
  question: string;
  answer: string;
  options: string[];
  type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'TRANSLATION';
  explanation?: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
  level: 'N4' | 'N3';
  grammarPoints: GrammarPoint[];
  vocabulary: Vocabulary[];
  questions: Question[];
}

export async function generateLesson(level: 'N4' | 'N3', topic?: string): Promise<GeneratedLesson> {
  const prompt = `Generate a comprehensive Japanese lesson for JLPT ${level} level${topic ? ` focusing on ${topic}` : ''}.

The lesson should include:

1. A clear title and description
2. 3-4 grammar points with explanations and examples
3. 8-10 vocabulary words with readings and meanings
4. 5 practice questions (mix of multiple choice, fill-in-blank, and translation)

For grammar points, focus on ${level === 'N4' ? 'basic to intermediate grammar patterns' : 'intermediate to advanced grammar patterns'}.

For vocabulary, include common words and phrases that would appear on the JLPT ${level} exam.

For questions, make them practical and test understanding of the grammar and vocabulary covered.

Return the response as a JSON object with this exact structure:
{
  "title": "Lesson Title",
  "description": "Brief description of what this lesson covers",
  "level": "${level}",
  "grammarPoints": [
    {
      "point": "Grammar pattern name",
      "explanation": "Clear explanation of how to use this grammar",
      "examples": ["Example sentence 1", "Example sentence 2", "Example sentence 3"]
    }
  ],
  "vocabulary": [
    {
      "word": "Japanese word",
      "reading": "Hiragana/katakana reading",
      "meaning": "English meaning"
    }
  ],
  "questions": [
    {
      "question": "Question text",
      "answer": "Correct answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "type": "MULTIPLE_CHOICE",
      "explanation": "Why this answer is correct"
    }
  ]
}

Make sure all Japanese text is properly formatted and the JSON is valid.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate lesson content');
  }

  try {
    const lesson = JSON.parse(content) as GeneratedLesson;
    return lesson;
  } catch (error) {
    throw new Error('Failed to parse generated lesson JSON');
  }
}

export async function generateAdditionalQuestions(
  lessonId: string,
  existingQuestions: Question[],
  count: number = 3
): Promise<Question[]> {
  const prompt = `Generate ${count} additional practice questions for a Japanese lesson.

The questions should be different from these existing questions:
${existingQuestions.map(q => `- ${q.question}`).join('\n')}

Generate a mix of question types:
- Multiple choice questions with 4 options
- Fill-in-the-blank questions
- Translation questions

For multiple choice questions, make sure the options array always has exactly 4 items.
For fill-in-blank and translation questions, the options array should be empty.

Return the response as a JSON array with this exact structure:
[
  {
    "question": "Question text",
    "answer": "Correct answer",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "type": "MULTIPLE_CHOICE",
    "explanation": "Why this answer is correct"
  }
]

Make sure the JSON is valid and all questions are appropriate for JLPT N4-N3 level.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate additional questions');
  }

  try {
    const questions = JSON.parse(content) as Question[];
    return questions;
  } catch (error) {
    throw new Error('Failed to parse generated questions JSON');
  }
} 