import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { ResultCard } from '@/features/chat/components/result-card';
import type { GrammarResult, TranslationResult } from '@shared/chat';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

const grammar: GrammarResult = {
  kind: 'grammar',
  original: 'I am go to office yesterday.',
  corrected: 'I went to the office yesterday.',
  isAlreadyCorrect: false,
  natural: 'I went into the office yesterday.',
  mistakes: [
    { category: 'tense', wrong: 'am go', right: 'went', severity: 'mandatory', explanation: 'Yesterday past batata hai.' },
    { category: 'vocabulary', wrong: 'to', right: 'into', severity: 'optional', explanation: 'Thoda zyada natural lagta hai.' },
  ],
  meaningHinglish: 'Main kal office gaya tha.',
  tip: 'Past time words ke saath V2 use karo.',
};

describe('ResultCard', () => {
  it('separates mandatory mistakes from optional improvements', async () => {
    await render(<ResultCard result={grammar} />);

    expect(screen.getByText('Corrected English')).toBeOnTheScreen();
    expect(screen.getByText(grammar.corrected)).toBeOnTheScreen();
    expect(screen.getByText('Mistakes')).toBeOnTheScreen();
    expect(screen.getByText('Optional improvements')).toBeOnTheScreen();
    expect(screen.getByText('Zaroori')).toBeOnTheScreen();
    expect(screen.getByText('Optional')).toBeOnTheScreen();
    expect(screen.getByText(grammar.meaningHinglish)).toBeOnTheScreen();
  });

  it('copies the corrected sentence', async () => {
    await render(<ResultCard result={{ ...grammar, natural: null }} />);
    await fireEvent.press(screen.getByLabelText('Copy text'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(grammar.corrected);
    expect(await screen.findByText('Copied')).toBeOnTheScreen();
  });

  it('shows an already-correct sentence without a mistakes section', async () => {
    await render(<ResultCard result={{ ...grammar, isAlreadyCorrect: true, natural: null, mistakes: [] }} />);

    expect(screen.getByText('Already correct ✓')).toBeOnTheScreen();
    expect(screen.queryByText('Mistakes')).toBeNull();
  });

  it('hides the practice answer until asked', async () => {
    await render(
      <ResultCard
        result={{
          kind: 'learning',
          topic: 'Present Perfect',
          explanation: 'has/have + V3',
          examples: [],
          practice: { question: 'I ___ (see) it.', answer: 'have seen' },
        }}
      />
    );

    expect(screen.queryByText('✓ have seen')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText('✓ have seen')).toBeOnTheScreen();
  });

  it('shows translation first and the clarifying question when ambiguous', async () => {
    const translation: TranslationResult = {
      kind: 'translation',
      detectedLanguage: 'roman_hindi',
      translation: 'Did you eat?',
      alternatives: [],
      ambiguity: {
        meanings: [{ english: 'Have you eaten?', interpretation: 'Khana ke baare mein' }],
        clarifyingQuestion: 'Aap kis context mein pooch rahe ho?',
      },
    };
    await render(<ResultCard result={translation} />);

    expect(screen.getByText('English · from Roman Hindi')).toBeOnTheScreen();
    expect(screen.getByText('Aap kis context mein pooch rahe ho?')).toBeOnTheScreen();
    expect(screen.queryByText('Mistakes')).toBeNull();
  });
});
