import type { SymbolViewProps } from 'expo-symbols';

import type { Mode } from '@shared/chat';

type ModeConfig = {
  label: string;
  title: string;
  icon: SymbolViewProps['name'];
  placeholder: string;
  description: string;
  examples: string[];
};

export const MODES: Record<Mode, ModeConfig> = {
  grammar: {
    title: 'Grammar Check',
    label: 'Grammar',
    icon: { ios: 'checkmark.seal', android: 'spellcheck', web: 'spellcheck' },
    placeholder: 'Type an English sentence…',
    description: 'English sentence likho — main galtiyan theek karke simple Hinglish mein samjhaunga.',
    examples: ['I am go to office yesterday.', 'She do not like coffee.', 'I will going to market tomorrow.'],
  },
  translate: {
    title: 'Hindi → English',
    label: 'Translate',
    icon: { ios: 'character.bubble', android: 'translate', web: 'translate' },
    placeholder: 'Hindi ya Hinglish mein likho…',
    description: 'Hindi, Roman Hindi ya Hinglish likho — natural English translation milega.',
    examples: ['Mujhe kal office nahi aana hai.', 'मैं कल बाजार गया था।', 'Meeting thodi late start hogi, sorry.'],
  },
  conversation: {
    title: 'Conversation Practice',
    label: 'Practice',
    icon: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
    placeholder: 'Say something in English…',
    description: 'English mein baat karo. Main reply karunga aur galtiyan politely theek karunga.',
    examples: ['Hi! I want improve my English.', 'What you did last weekend?', 'Tell me about your favourite food.'],
  },
  professional: {
    title: 'Professional English',
    label: 'Professional',
    icon: { ios: 'briefcase', android: 'work', web: 'work' },
    placeholder: 'Paste an office message or email…',
    description: 'Office message, email ya status update likho — clear aur polite English mein rewrite karunga.',
    examples: [
      'sir i will not come today because fever',
      'pls send the report asap its urgent',
      'Status: login bug fixed, testing pending, will deploy tmrw',
    ],
  },
  learn: {
    title: 'Learn Grammar',
    label: 'Learn',
    icon: { ios: 'book', android: 'menu_book', web: 'menu_book' },
    placeholder: 'Ask about a grammar topic…',
    description: 'Koi bhi grammar topic poocho — tenses, articles, prepositions, vocabulary.',
    examples: ['Present perfect kab use karte hain?', 'a, an aur the mein kya difference hai?', 'in, on, at kaise use karein?'],
  },
};

export const MODE_ORDER: Mode[] = ['grammar', 'translate', 'conversation', 'professional', 'learn'];
