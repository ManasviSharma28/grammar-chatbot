import { Router } from 'express';
import { isValidObjectId } from 'mongoose';

import { ChatRequestSchema, type AssistantResult, type ChatResponse } from '../../../shared/chat.js';
import type { Coach, PriorTurn } from '../ai/coach.js';
import { Conversation, Message } from '../db.js';
import { HttpError } from '../errors.js';

const HISTORY_LIMIT = 20;
const TITLE_LENGTH = 60;

export function chatRouter(coach: Coach) {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request');
    const { mode, text, conversationId } = parsed.data;
    const userId = req.userId!;

    // Look up by both id and owner so one user can never touch another's conversation.
    const existing =
      conversationId && isValidObjectId(conversationId)
        ? await Conversation.findOne({ _id: conversationId, userId })
        : null;
    if (conversationId && !existing) throw new HttpError(404, 'Conversation not found');

    const history: PriorTurn[] = existing
      ? (await Message.find({ conversationId: existing._id }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean())
          .reverse()
          .map((m) =>
            m.role === 'user'
              ? { role: 'user', text: m.text ?? '' }
              : { role: 'assistant', result: m.result as AssistantResult }
          )
      : [];

    // Call the AI before writing anything, so a failure leaves no half-saved exchange.
    const result = await coach({ mode, text, history });

    const conversation =
      existing ??
      (await Conversation.create({
        userId,
        title: text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH)}…` : text,
      }));
    await Message.create({ conversationId: conversation._id, userId, role: 'user', mode, text });
    const reply = await Message.create({ conversationId: conversation._id, userId, role: 'assistant', mode, result });
    if (existing) await Conversation.updateOne({ _id: existing._id }, { $currentDate: { updatedAt: true } });

    const body: ChatResponse = {
      conversationId: conversation._id.toString(),
      messageId: reply._id.toString(),
      createdAt: reply.createdAt.toISOString(),
      result,
    };
    res.json(body);
  });

  return router;
}
