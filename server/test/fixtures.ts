import type { ConversationResult, GrammarResult } from '../../shared/chat.js';

export const grammarResult: GrammarResult = {
  kind: 'grammar',
  original: 'I am go to office yesterday.',
  corrected: 'I went to the office yesterday.',
  isAlreadyCorrect: false,
  natural: null,
  mistakes: [
    { category: 'tense', wrong: 'am go', right: 'went', severity: 'mandatory', explanation: 'Yesterday past batata hai.' },
  ],
  meaningHinglish: 'Main kal office gaya tha.',
  tip: 'Past time ke saath V2 use karo.',
};

export const conversationResult: ConversationResult = {
  kind: 'conversation',
  reply: 'Nice! What do you like to read?',
  correction: null,
};
