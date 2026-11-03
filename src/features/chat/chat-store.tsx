import { createContext, use, useReducer, type ReactNode } from 'react';

import type { AssistantResult, Mode } from '@shared/chat';

import type { ChatApi } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';

export type UserMessage = {
  id: string;
  role: 'user';
  mode: Mode;
  text: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'failed';
  error: { message: string; retryable: boolean } | null;
};

export type AssistantMessage = {
  id: string;
  role: 'assistant';
  createdAt: string;
  result: AssistantResult;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type Conversation = {
  id: string;
  /** Server-side id, known after the first successful reply. */
  remoteId: string | null;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type Settings = {
  /** User consent to track recurring mistakes (Phase 6). */
  trackProgress: boolean;
};

type State = {
  conversations: Conversation[];
  activeId: string | null;
  mode: Mode;
  settings: Settings;
};

type Action =
  | { type: 'add'; conversation: Conversation; message: UserMessage }
  | { type: 'resolve'; conversationId: string; messageId: string; remoteId: string; reply: AssistantMessage }
  | { type: 'fail'; conversationId: string; messageId: string; error: UserMessage['error'] }
  | { type: 'retry'; conversationId: string; messageId: string }
  | { type: 'setMode'; mode: Mode }
  | { type: 'open'; conversationId: string | null }
  | { type: 'delete'; conversationId: string }
  | { type: 'clear' }
  | { type: 'settings'; settings: Partial<Settings> };

const TITLE_LENGTH = 48;

function updateConversation(state: State, id: string, update: (c: Conversation) => Conversation): State {
  return {
    ...state,
    conversations: state.conversations.map((c) => (c.id === id ? update(c) : c)),
  };
}

function updateUserMessage(
  conversation: Conversation,
  messageId: string,
  update: (m: UserMessage) => UserMessage
): ChatMessage[] {
  return conversation.messages.map((m) => (m.id === messageId && m.role === 'user' ? update(m) : m));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const existing = state.conversations.find((c) => c.id === action.conversation.id);
      const conversation = {
        ...(existing ?? action.conversation),
        updatedAt: action.message.createdAt,
        messages: [...(existing?.messages ?? []), action.message],
      };
      return {
        ...state,
        activeId: conversation.id,
        conversations: [conversation, ...state.conversations.filter((c) => c.id !== conversation.id)],
      };
    }
    case 'resolve':
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        remoteId: action.remoteId,
        updatedAt: action.reply.createdAt,
        messages: [
          ...updateUserMessage(c, action.messageId, (m) => ({ ...m, status: 'sent', error: null })),
          action.reply,
        ],
      }));
    case 'fail':
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        messages: updateUserMessage(c, action.messageId, (m) => ({ ...m, status: 'failed', error: action.error })),
      }));
    case 'retry':
      return updateConversation(state, action.conversationId, (c) => ({
        ...c,
        messages: updateUserMessage(c, action.messageId, (m) => ({ ...m, status: 'pending', error: null })),
      }));
    case 'setMode':
      return { ...state, mode: action.mode };
    case 'open':
      return { ...state, activeId: action.conversationId };
    case 'delete':
      return {
        ...state,
        activeId: state.activeId === action.conversationId ? null : state.activeId,
        conversations: state.conversations.filter((c) => c.id !== action.conversationId),
      };
    case 'clear':
      return { ...state, activeId: null, conversations: [] };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
  }
}

let counter = 0;
const localId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

function useChatState(api: ChatApi) {
  const [state, dispatch] = useReducer(reducer, {
    conversations: [],
    activeId: null,
    mode: 'grammar',
    settings: { trackProgress: false },
  });

  const active = state.conversations.find((c) => c.id === state.activeId) ?? null;
  const isSending = active?.messages.some((m) => m.role === 'user' && m.status === 'pending') ?? false;

  async function deliver(conversation: Conversation, message: UserMessage) {
    try {
      const response = await api.send({
        mode: message.mode,
        text: message.text,
        conversationId: conversation.remoteId,
      });
      dispatch({
        type: 'resolve',
        conversationId: conversation.id,
        messageId: message.id,
        remoteId: response.conversationId,
        reply: { id: response.messageId, role: 'assistant', createdAt: response.createdAt, result: response.result },
      });
    } catch (error) {
      const apiError = toApiError(error);
      dispatch({
        type: 'fail',
        conversationId: conversation.id,
        messageId: message.id,
        error: { message: apiError.message, retryable: apiError.retryable },
      });
    }
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    const now = new Date().toISOString();
    const conversation: Conversation = active ?? {
      id: localId('conv'),
      remoteId: null,
      title: trimmed.length > TITLE_LENGTH ? `${trimmed.slice(0, TITLE_LENGTH)}…` : trimmed,
      updatedAt: now,
      messages: [],
    };
    const message: UserMessage = {
      id: localId('msg'),
      role: 'user',
      mode: state.mode,
      text: trimmed,
      createdAt: now,
      status: 'pending',
      error: null,
    };
    dispatch({ type: 'add', conversation, message });
    void deliver(conversation, message);
  }

  function retry(messageId: string) {
    const message = active?.messages.find((m) => m.id === messageId);
    if (!active || !message || message.role !== 'user' || isSending) return;
    dispatch({ type: 'retry', conversationId: active.id, messageId });
    void deliver(active, message);
  }

  return {
    ...state,
    active,
    isSending,
    isPreview: api.isPreview,
    send,
    retry,
    setMode: (mode: Mode) => dispatch({ type: 'setMode', mode }),
    newChat: () => dispatch({ type: 'open', conversationId: null }),
    open: (conversationId: string) => dispatch({ type: 'open', conversationId }),
    remove: (conversationId: string) => dispatch({ type: 'delete', conversationId }),
    clearHistory: () => dispatch({ type: 'clear' }),
    updateSettings: (settings: Partial<Settings>) => dispatch({ type: 'settings', settings }),
  };
}

type ChatContextValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ api, children }: { api: ChatApi; children: ReactNode }) {
  return <ChatContext value={useChatState(api)}>{children}</ChatContext>;
}

export function useChat() {
  const value = use(ChatContext);
  if (!value) throw new Error('useChat must be used inside <ChatProvider>');
  return value;
}
