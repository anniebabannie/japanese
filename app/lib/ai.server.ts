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
- Provide comprehensive, detailed explanations that include:
  * The exact meaning and usage of the grammar pattern
  * When and how to use it (context, situations, formality level)
  * Grammatical structure breakdown (required vs optional parts)
  * Common variations or related forms
  * How it differs from similar patterns
  * Typical learner mistakes and how to avoid them (be encouraging!)
  * Politeness levels and register considerations
  * Any special notes about conjugation or particle usage
- Give 3-4 examples with English translations: one from the text, plus additional examples showing different contexts
- Format examples as "Japanese sentence - English translation"
- Write in a clear, direct tone that gets straight to the point - no introductory phrases like "Hello" or "Let's dive into"
- Use markdown formatting for better readability (bold, italics, bullet points)
- Make explanations specific and actionable, not vague generalizations
- Include information about politeness levels, formality, and register when relevant
- Make it feel like a helpful tutor explaining things clearly and directly
- IMPORTANT: Ensure all JSON is properly escaped. Use \\n for line breaks and escape any quotes within the explanation text

For vocabulary:
- Extract important words from the text
- Include readings (hiragana/katakana) and English meanings
- Focus on words that are useful for JLPT ${level} level

For questions:
- Include 2-3 reading comprehension questions in Japanese (読解)
- Include 1-2 grammar-focused questions in Japanese (文法)
- Include 1 vocabulary question in Japanese (語彙)
- Use only these exact question types: "MULTIPLE_CHOICE", "FILL_IN_BLANK", "TRANSLATION"
- For MULTIPLE_CHOICE questions, always provide exactly 4 options in Japanese
- For FILL_IN_BLANK and TRANSLATION questions, use an empty options array []
- All questions, answers, and options should be written in Japanese
- Questions should follow JLPT ${level} format and difficulty level
- Use authentic JLPT-style question formats and natural Japanese

Return the response as a JSON object with this exact structure:
{
  "title": "Lesson Title",
  "description": "Brief description of what this lesson covers",
  "level": "${level}",
  "story": "The Japanese story or article text here",
  "grammarPoints": [
    {
      "point": "Grammar pattern name",
      "explanation": "**Pattern name** is used to express... (detailed explanation with markdown formatting and proper JSON escaping)",
      "examples": ["Japanese sentence - English translation", "Japanese sentence - English translation", "Japanese sentence - English translation"]
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
  lessonContent: {
    story: string;
    grammarPoints: GrammarPoint[];
    vocabulary: Vocabulary[];
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  },
  count: number = 3
): Promise<Question[]> {
  const prompt = `Generate ${count} additional practice questions for a Japanese lesson.

LESSON CONTENT:
Story: ${lessonContent.story}

Grammar Points:
${lessonContent.grammarPoints.map((gp, i) => `${i + 1}. ${gp.point}: ${gp.explanation}`).join('\n')}

Vocabulary:
${lessonContent.vocabulary.map(v => `- ${v.word} (${v.reading || 'no reading'}) - ${v.meaning}`).join('\n')}

The questions should be different from these existing questions:
${existingQuestions.map(q => `- ${q.question}`).join('\n')}

IMPORTANT: All questions MUST be directly related to the lesson content above and follow JLPT ${lessonContent.level} format:

JLPT ${lessonContent.level} QUESTION FORMATS:

1. READING COMPREHENSION (読解):
   - Questions about main ideas, details, and inference from the story
   - Format: "この文章の内容と合っているものはどれですか。" or "筆者の考えとして正しいものはどれですか。"
   - 4 multiple choice options in Japanese

2. GRAMMAR (文法):
   - Test understanding of grammar patterns from the lesson
   - Format: "______に入る最も適切なものはどれですか。" or "正しい文はどれですか。"
   - Fill-in-the-blank or sentence correction format
   - 4 multiple choice options for grammar questions

3. VOCABULARY (語彙):
   - Test understanding of vocabulary words from the lesson
   - Format: "______の言葉の意味として最も適切なものはどれですか。" or "この言葉の使い方として正しいものはどれですか。"
   - 4 multiple choice options in Japanese

4. TRANSLATION (翻訳):
   - Translate Japanese sentences to English or vice versa
   - Format: "次の日本語を英語に訳しなさい。" or "次の英語を日本語に訳しなさい。"

JLPT ${lessonContent.level} DIFFICULTY:
- Use vocabulary and grammar appropriate for ${lessonContent.level} level
- Questions should be challenging but achievable for ${lessonContent.level} students
- Include both straightforward questions and questions requiring inference
- Use natural, authentic Japanese that appears on actual JLPT tests

Generate a mix of question types:
- Multiple choice questions with 4 options
- Fill-in-the-blank questions
- Translation questions

For multiple choice questions, make sure the options array always has exactly 4 items.
For fill-in-blank and translation questions, the options array should be empty.

IMPORTANT: Use ONLY these exact type values:
- "MULTIPLE_CHOICE" for multiple choice questions
- "FILL_IN_BLANK" for fill-in-the-blank questions (NOT "FILL_IN_THE_BLANK")
- "TRANSLATION" for translation questions

Return the response as a JSON array with this exact structure:
[
  {
    "question": "Question text in Japanese",
    "answer": "Correct answer in Japanese",
    "options": ["Option A in Japanese", "Option B in Japanese", "Option C in Japanese", "Option D in Japanese"],
    "type": "MULTIPLE_CHOICE",
    "explanation": "Why this answer is correct (in English for clarity)"
  }
]

IMPORTANT: 
- Questions should be written in Japanese
- Answers should be in Japanese
- Multiple choice options should be in Japanese
- Explanations can be in English for clarity
- Make sure the JSON is valid and all questions are appropriate for JLPT N4-N3 level.`;

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
  * For complex phrases: Break down and find the main verb/noun (位置しており → 位置する)
- If the word contains kanji, provide the hiragana reading of the dictionary form
- If it's already in hiragana or katakana, provide the reading of the dictionary form
- Provide a clear, concise English meaning
- If the word has multiple meanings, provide the most common one
- If you're not sure about the word, provide your best guess based on the characters
- For originalForm: Use the exact word as it appeared in the text
- For conjugationInfo: Provide conjugation details only if the word was conjugated (e.g., "past tense", "polite form", "negative form", "te-form + いる")

Examples:
- 行きます → 行く (いく) - to go, originalForm: "行きます", conjugationInfo: "polite present tense"
- 食べました → 食べる (たべる) - to eat, originalForm: "食べました", conjugationInfo: "polite past tense"
- 美しいです → 美しい (うつくしい) - beautiful, originalForm: "美しいです", conjugationInfo: "polite form"
- 学生です → 学生 (がくせい) - student, originalForm: "学生です", conjugationInfo: null
- 位置しており → 位置する (いちする) - to be located, originalForm: "位置しており", conjugationInfo: "te-form + いる (progressive)"

IMPORTANT: Return ONLY valid JSON. Do not include any additional text, explanations, or markdown formatting.`;

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
    console.error('Failed to parse LLM response:', content);
    console.error('Parse error:', error);
    
    // Try to extract JSON from the response if it's wrapped in other text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const vocabulary = JSON.parse(jsonMatch[0]) as Vocabulary;
        return vocabulary;
      } catch (secondError) {
        console.error('Failed to parse extracted JSON:', jsonMatch[0]);
      }
    }
    
    throw new Error(`Failed to parse word lookup JSON. LLM response: ${content.substring(0, 200)}...`);
  }
} 

export async function regenerateGrammarPoints(
  lessonId: string,
  lessonContent: {
    story: string;
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  }
): Promise<GrammarPoint[]> {
  const prompt = `Analyze this Japanese text and identify 3-4 important grammar patterns that appear in it. Generate comprehensive, detailed explanations for each grammar point.

TEXT TO ANALYZE:
${lessonContent.story}

JLPT LEVEL: ${lessonContent.level}

For each grammar point, provide:

1. GRAMMAR PATTERN NAME: The specific pattern (e.g., "〜た理由は〜だからです")

2. COMPREHENSIVE EXPLANATION (200-300 words, direct and engaging):
   - Start directly with the explanation - no introductory phrases like "Hello" or "Let's dive into"
   - Write in a clear, engaging tone that gets straight to the point
   - Use engaging language, analogies, and real-world examples
   - Include the exact meaning and primary usage
   - Explain when to use it (context, situations, formality level)
   - Break down the grammatical structure (required vs optional parts)
   - Show common variations or related forms
   - Explain how it differs from similar patterns
   - Share typical learner mistakes and how to avoid them (be encouraging!)
   - Cover politeness levels and register considerations
   - Add any special notes about conjugation or particle usage
   - Use markdown formatting for better readability (bold, italics, bullet points)
   - Make it feel like a helpful tutor explaining things clearly and directly
- IMPORTANT: Ensure all JSON is properly escaped. Use \\n for line breaks and escape any quotes within the explanation text

3. EXAMPLES (3-4 sentences with English translations):
   - One example from the text above with English translation
   - 2-3 additional examples showing different contexts and variations
   - Include both positive and negative forms if applicable
   - Show different politeness levels if relevant
   - Format: "Japanese sentence - English translation"

EXAMPLE FORMAT:
{
  "point": "〜た理由は〜だからです",
  "explanation": "**〜た理由は〜だからです** is your go-to way to explain *why* something happened in the past. It\\'s like saying \\\"The reason X happened is because Y\\\" - but in a really polite, formal way that Japanese people love!\\n\\nHere\\'s how it works: you\\'ve got two main parts. The first part (with **〜た**) tells us *what* happened, and the second part (with **〜だからです**) tells us *why* it happened. It\\'s like building a little story with a clear cause-and-effect relationship.\\n\\n**When should you use this?** Perfect for formal situations like job interviews, academic writing, or when you want to sound really polished and professional. It\\'s more formal than simple **〜から** or **〜ので**, so it shows you really know your stuff!\\n\\n**Watch out for these common mistakes:**\\n- Don\\'t forget the **です** at the end in formal situations\\n- Make sure you\\'re using the past tense (**〜た**) in the first part\\n- Remember, this is for explaining past events, not future ones!\\n\\n**Pro tip:** This pattern is like the \\\"grown-up\\\" version of giving reasons. It\\'s what you\\'d use when you want to sound really sophisticated and well-educated.",
  "examples": [
    "彼が遅刻した理由は電車が遅れたからです。 - The reason he was late is because the train was delayed.",
    "試験に落ちた理由は勉強しなかったからです。 - The reason I failed the exam is because I didn't study.",
    "会社を辞めた理由は給料が安かったからです。 - The reason I quit the company is because the salary was low."
  ]
}

Return the response as a JSON array with this exact structure:
[
  {
    "point": "Grammar pattern name",
    "explanation": "Comprehensive explanation (200-300 words)",
    "examples": ["Example 1", "Example 2", "Example 3"]
  }
]

Focus on grammar patterns that are:
- Actually present in the text
- Appropriate for JLPT ${lessonContent.level} level
- Important for understanding the text
- Commonly tested on JLPT exams

Make explanations detailed, specific, and actionable. Avoid vague statements like "This pattern is used to express..." without explaining exactly how, when, and why to use it.

CRITICAL: Return ONLY valid JSON. All quotes within the explanation text must be escaped with backslashes. Use \\n for line breaks. Do not include any additional text, explanations, or markdown formatting outside the JSON structure.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to regenerate grammar points');
  }

  try {
    const grammarPoints = JSON.parse(content) as GrammarPoint[];
    return grammarPoints;
  } catch (error) {
    console.error('Failed to parse JSON. Raw content:', content);
    console.error('Parse error:', error);
    throw new Error('Failed to parse generated grammar points JSON');
  }
} 