/**
 * UI preview used only while no backend is configured (EXPO_PUBLIC_API_URL
 * unset). It does NOT correct or translate anything — it returns fixed sample
 * cards so every screen state can be exercised before the AI backend exists.
 */
import type { AssistantResult, ChatRequest, ChatResponse, Mode } from '@shared/chat';

import type { ChatApi } from '@/lib/api/client';

const PREVIEW_NOTE = 'Preview mode: AI backend abhi connect nahi hai, ye sample jawab hai.';

const SAMPLES: Record<Mode, (text: string) => AssistantResult> = {
  grammar: (text) => ({
    kind: 'grammar',
    original: text,
    corrected: 'I went to the office yesterday.',
    isAlreadyCorrect: false,
    natural: null,
    mistakes: [
      {
        category: 'tense',
        wrong: 'am go',
        right: 'went',
        severity: 'mandatory',
        explanation: "'Yesterday' past time batata hai, isliye 'go' ki jagah past tense 'went' use karte hain.",
      },
      {
        category: 'article',
        wrong: 'office',
        right: 'the office',
        severity: 'mandatory',
        explanation: "Specific office ki baat ho rahi hai, isliye 'the' lagate hain.",
      },
    ],
    meaningHinglish: 'Main kal office gaya tha.',
    tip: PREVIEW_NOTE,
  }),
  translate: () => ({
    kind: 'translation',
    detectedLanguage: 'roman_hindi',
    translation: "I don't have to come to the office tomorrow.",
    alternatives: ["I don't need to come to the office tomorrow."],
    ambiguity: null,
  }),
  conversation: () => ({
    kind: 'conversation',
    reply: `That's great! Practising every day is the best way to improve. ${PREVIEW_NOTE}`,
    correction: {
      corrected: 'Hi! I want to improve my English.',
      mistakes: [
        {
          category: 'other',
          wrong: 'want improve',
          right: 'want to improve',
          severity: 'mandatory',
          explanation: "'Want' ke baad doosra verb aaye to 'to' lagta hai: want to + verb.",
        },
      ],
    },
  }),
  professional: () => ({
    kind: 'professional',
    rewritten: "Hi Sir, I'm unwell with a fever today, so I won't be able to come to the office. I'll keep an eye on email for anything urgent.",
    subject: 'Sick leave today',
    tone: 'Polite, concise',
    changes: [PREVIEW_NOTE, "'because fever' ko poora sentence banaya: 'I'm unwell with a fever'."],
  }),
  learn: () => ({
    kind: 'learning',
    topic: 'Present Perfect Tense',
    explanation: `Jab koi kaam past mein hua ho lekin uska asar ya relevance abhi bhi ho, tab present perfect (has/have + V3) use karte hain. ${PREVIEW_NOTE}`,
    examples: [
      { english: 'I have finished my work.', hinglish: 'Maine apna kaam khatam kar liya hai.', note: null },
      { english: 'She has lived here for five years.', hinglish: 'Woh paanch saal se yahan reh rahi hai.', note: "Duration ke saath 'for' lagta hai." },
    ],
    practice: { question: 'Fill in: I ___ (see) this movie already.', answer: 'have seen' },
  }),
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

export function createPreviewChatApi(delayMs = 900): ChatApi {
  return {
    isPreview: true,
    async send(request: ChatRequest): Promise<ChatResponse> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        conversationId: request.conversationId ?? nextId('preview-conv'),
        messageId: nextId('preview-msg'),
        createdAt: new Date().toISOString(),
        result: SAMPLES[request.mode](request.text),
      };
    },
  };
}
