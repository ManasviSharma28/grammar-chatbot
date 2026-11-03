import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import ChatScreen from '@/app/index';
import { ChatProvider } from '@/features/chat/chat-store';
import type { ChatApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { ChatRequest, ChatResponse } from '@shared/chat';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

function reply(request: ChatRequest): ChatResponse {
  return {
    conversationId: request.conversationId ?? 'server-conv-1',
    messageId: `reply-${request.text}`,
    createdAt: '2026-10-26T10:00:00.000Z',
    result: {
      kind: 'translation',
      detectedLanguage: 'roman_hindi',
      translation: "I don't have to come to the office tomorrow.",
      alternatives: [],
      ambiguity: null,
    },
  };
}

async function renderChat(send: ChatApi['send']) {
  const api: ChatApi = { isPreview: false, send: jest.fn(send) };
  await renderRouter({
    _layout: () => (
      <ChatProvider api={api}>
        <Stack />
      </ChatProvider>
    ),
    index: ChatScreen,
  });
  return api;
}

async function type(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByLabelText('Send message'));
}

describe('ChatScreen', () => {
  it('shows the empty state with examples for the selected mode', async () => {
    await renderChat(async (r) => reply(r));
    expect(screen.getByText('I am go to office yesterday.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Translate' }));
    expect(screen.getByText('Mujhe kal office nahi aana hai.')).toBeOnTheScreen();
  });

  it('sends a message with the selected mode and renders the reply', async () => {
    const api = await renderChat(async (r) => reply(r));
    await fireEvent.press(screen.getByRole('tab', { name: 'Translate' }));
    await type('Mujhe kal office nahi aana hai.');

    expect(await screen.findByText("I don't have to come to the office tomorrow.")).toBeOnTheScreen();
    expect(api.send).toHaveBeenCalledWith({
      mode: 'translate',
      text: 'Mujhe kal office nahi aana hai.',
      conversationId: null,
    });
  });

  it('reuses the server conversation id for follow-up messages', async () => {
    const api = await renderChat(async (r) => reply(r));
    await type('first');
    await screen.findByText("I don't have to come to the office tomorrow.");
    await type('second');
    await screen.findAllByText("I don't have to come to the office tomorrow.");

    expect(api.send).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'second', conversationId: 'server-conv-1' }));
  });

  it('keeps send disabled for empty input', async () => {
    const api = await renderChat(async (r) => reply(r));
    await type('   ');
    expect(api.send).not.toHaveBeenCalled();
  });

  it('shows the typing indicator while waiting', async () => {
    let resolve: (value: ChatResponse) => void = () => {};
    await renderChat((r) => new Promise((res) => (resolve = () => res(reply(r)))));
    await type('hello');

    expect(screen.getByLabelText('Assistant is typing')).toBeOnTheScreen();
    resolve(reply({ mode: 'grammar', text: 'hello', conversationId: null }));
    await screen.findByText("I don't have to come to the office tomorrow.");
    expect(screen.queryByLabelText('Assistant is typing')).toBeNull();
  });

  it('shows an error with retry, and retry resends the same message', async () => {
    let calls = 0;
    const api = await renderChat(async (r) => {
      calls += 1;
      if (calls === 1) throw new ApiError('network');
      return reply(r);
    });
    await type('Mujhe kal office nahi aana hai.');

    expect(await screen.findByText(new ApiError('network').message)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText("I don't have to come to the office tomorrow.")).toBeOnTheScreen();
    expect(api.send).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(new ApiError('network').message)).toBeNull();
  });

  it('does not offer retry for non-retryable errors', async () => {
    await renderChat(async () => {
      throw new ApiError('invalid_input', 'Message too long');
    });
    await type('hello');

    expect(await screen.findByText('Message too long')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
