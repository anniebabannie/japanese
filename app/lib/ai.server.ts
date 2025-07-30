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
  originalForm?: string;
  conjugationInfo?: string;
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
  story: string;
  grammarPoints: GrammarPoint[];
  vocabulary: Vocabulary[];
  questions: Question[];
}

export async function generateLesson(level: 'N4' | 'N3', topic?: string): Promise<GeneratedLesson> {
  const prompt = `Generate a comprehensive Japanese lesson for JLPT ${level} level${topic ? ` about ${topic}` : ''}.

The lesson should include:

1. A clear title and description
2. A story or article (500-600 words) written in Japanese at JLPT ${level} level
3. 3-4 grammar points that appear in the text, with explanations and examples
4. 8-10 vocabulary words extracted from the text with readings and meanings
5. 5 practice questions including reading comprehension questions in Japanese

For the story/article:
- Write an engaging, culturally appropriate story or informative article
- Use vocabulary and grammar appropriate for JLPT ${level} level
- Make it interesting and relatable for language learners
- Include natural dialogue and descriptive language

For grammar points:
- Focus on grammar patterns that actually appear in the text
- Provide clear explanations of how they work
- Give examples from the text and additional examples

For vocabulary:
- Extract important words from the text
- Include readings (hiragana/katakana) and English meanings
- Focus on words that are useful for JLPT ${level} level

For questions:
- Include 2-3 reading comprehension questions in Japanese
- Include 1-2 grammar-focused questions
- Include 1 vocabulary question
- Use only these question types: MULTIPLE_CHOICE, FILL_IN_BLANK, TRANSLATION
- For MULTIPLE_CHOICE questions, always provide exactly 4 options
- For FILL_IN_BLANK and TRANSLATION questions, use an empty options array []

Return the response as a JSON object with this exact structure:
{
  "title": "Lesson Title",
  "description": "Brief description of what this lesson covers",
  "level": "${level}",
  "story": "The Japanese story or article text here",
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
      "question": "Question text (can be in Japanese for reading comprehension)",
      "answer": "Correct answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "type": "MULTIPLE_CHOICE",
      "explanation": "Why this answer is correct"
    },
    {
      "question": "Fill in the blank question",
      "answer": "Correct answer",
      "options": [],
      "type": "FILL_IN_BLANK",
      "explanation": "Why this answer is correct"
    },
    {
      "question": "Translate this sentence to Japanese",
      "answer": "Correct Japanese translation",
      "options": [],
      "type": "TRANSLATION",
      "explanation": "Why this answer is correct"
    }
  ]
}

Make sure all Japanese text is properly formatted and the JSON is valid. The story should be engaging and the grammar points should naturally appear in the text.`;

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

export async function lookupJapaneseWord(word: string): Promise<Vocabulary> {
  const prompt = `Look up the Japanese word "${word}" and provide its dictionary form, reading, and meaning.

Return the response as a JSON object with this exact structure:
{
  "word": "Dictionary form of the word",
  "reading": "Hiragana/katakana reading of the dictionary form",
  "meaning": "English meaning and explanation",
  "originalForm": "The original word as it appeared in the text",
  "conjugationInfo": "Conjugation information (only if the word was conjugated)"
}

Guidelines:
- ALWAYS convert the word to its dictionary form (辞書形):
  * For verbs: Convert to plain form (行きます → 行く, 食べました → 食べる, 来ます → 来る)
  * For adjectives: Convert to plain form (美しいです → 美しい, 大きいです → 大きい)
  * For nouns: Keep as is (学生です → 学生)
  * For です/だ: Remove them (学生です → 学生)
- If the word contains kanji, provide the hiragana reading of the dictionary form
- If it's already in hiragana or katakana, provide the reading of the dictionary form
- Provide a clear, concise English meaning
- If the word has multiple meanings, provide the most common one
- If you're not sure about the word, provide your best guess based on the characters
- For originalForm: Use the exact word as it appeared in the text
- For conjugationInfo: Provide conjugation details only if the word was conjugated (e.g., "past tense", "polite form", "negative form")

Examples:
- 行きます → 行く (いく) - to go, originalForm: "行きます", conjugationInfo: "polite present tense"
- 食べました → 食べる (たべる) - to eat, originalForm: "食べました", conjugationInfo: "polite past tense"
- 美しいです → 美しい (うつくしい) - beautiful, originalForm: "美しいです", conjugationInfo: "polite form"
- 学生です → 学生 (がくせい) - student, originalForm: "学生です", conjugationInfo: null

Make sure the JSON is valid.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to look up word');
  }

  try {
    const vocabulary = JSON.parse(content) as Vocabulary;
    return vocabulary;
  } catch (error) {
    throw new Error('Failed to parse word lookup JSON');
  }
} 