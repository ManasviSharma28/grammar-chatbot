import { AssistantResultSchema, ChatRequestSchema, MAX_INPUT_LENGTH } from '../chat';

const grammar = {
  kind: 'grammar',
  original: 'I am go to office yesterday.',
  corrected: 'I went to the office yesterday.',
  isAlreadyCorrect: false,
  natural: null,
  mistakes: [
    { category: 'tense', wrong: 'am go', right: 'went', severity: 'mandatory', explanation: 'Yesterday past batata hai.' },
  ],
  meaningHinglish: 'Main kal office gaya tha.',
  tip: 'Past time words ke saath V2 use karo.',
};

describe('AssistantResultSchema', () => {
  it('accepts a well-formed grammar result', () => {
    expect(AssistantResultSchema.safeParse(grammar).success).toBe(true);
  });

  it('rejects a result with a missing required field', () => {
    const { corrected: _omit, ...broken } = grammar;
    expect(AssistantResultSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects an unknown severity', () => {
    const broken = { ...grammar, mistakes: [{ ...grammar.mistakes[0], severity: 'critical' }] };
    expect(AssistantResultSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects an unknown result kind', () => {
    expect(AssistantResultSchema.safeParse({ ...grammar, kind: 'poem' }).success).toBe(false);
  });

  it('accepts a translation with an ambiguity block', () => {
    const translation = {
      kind: 'translation',
      detectedLanguage: 'roman_hindi',
      translation: 'Did you eat?',
      alternatives: [],
      ambiguity: {
        meanings: [{ english: 'Have you eaten?', interpretation: 'Khana kha liya?' }],
        clarifyingQuestion: 'Kya aap khana ki baat kar rahe ho?',
      },
    };
    expect(AssistantResultSchema.safeParse(translation).success).toBe(true);
  });
});

describe('ChatRequestSchema', () => {
  it('trims and accepts normal input', () => {
    const parsed = ChatRequestSchema.parse({ mode: 'grammar', text: '  hello  ', conversationId: null });
    expect(parsed.text).toBe('hello');
  });

  it('rejects empty or whitespace-only input', () => {
    expect(ChatRequestSchema.safeParse({ mode: 'grammar', text: '   ', conversationId: null }).success).toBe(false);
  });

  it(`rejects input longer than ${MAX_INPUT_LENGTH} characters`, () => {
    const text = 'a'.repeat(MAX_INPUT_LENGTH + 1);
    expect(ChatRequestSchema.safeParse({ mode: 'grammar', text, conversationId: null }).success).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(ChatRequestSchema.safeParse({ mode: 'poetry', text: 'hi', conversationId: null }).success).toBe(false);
  });
});
