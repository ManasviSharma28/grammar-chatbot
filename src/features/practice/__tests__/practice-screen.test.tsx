import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PracticeScreen from '@/app/practice';

// Reanimated's native module can't load under Jest, so gestures are checked on a device.
jest.mock('@/features/practice/motion-examples', () => ({ MotionExamples: () => null }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PracticeScreen />
    </SafeAreaProvider>
  );
}

async function openTab(name: string) {
  await fireEvent.press(screen.getByRole('tab', { name }));
}

describe('PracticeScreen', () => {
  it('shows each topic when its tab is selected', async () => {
    await renderScreen();
    expect(screen.getByText('Safe areas')).toBeTruthy();

    await openTab('Lists');
    expect(screen.getByText('50 items loaded')).toBeTruthy();

    await openTab('Forms');
    expect(screen.getByText('Sign-up form')).toBeTruthy();
  });

  it('shows form errors on submit, then accepts valid input', async () => {
    await renderScreen();
    await openTab('Forms');

    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Asha');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'long-enough');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Account created for Asha.')).toBeTruthy();
  });
});
