import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatResponseSchema, MAX_INPUT_LENGTH } from '../../shared/chat.js';
import type { Coach } from '../src/ai/coach.js';
import { createApp } from '../src/app.js';
import { Conversation, Message } from '../src/db.js';
import { AiError } from '../src/errors.js';
import { conversationResult, grammarResult } from './fixtures.js';

let mongo: MongoMemoryServer;
const coach = vi.fn<Coach>();

function app(chatRateLimitPerMinute = 100) {
  return createApp({ coach, jwtSecret: 'x'.repeat(40), corsOrigins: [], chatRateLimitPerMinute });
}

async function newUser(server = app()) {
  const res = await request(server).post('/api/auth/anonymous').expect(201);
  return res.body.token as string;
}

function chat(server: ReturnType<typeof app>, token: string, body: object) {
  return request(server).post('/api/chat').set('Authorization', `Bearer ${token}`).send(body);
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  coach.mockReset();
  coach.mockResolvedValue(grammarResult);
  await mongoose.connection.db!.dropDatabase();
});

describe('auth', () => {
  it('rejects chat without a token', async () => {
    await request(app()).post('/api/chat').send({ mode: 'grammar', text: 'hi', conversationId: null }).expect(401);
  });

  it('rejects a forged token', async () => {
    const forged = await newUser(createApp({ coach, jwtSecret: 'y'.repeat(40), corsOrigins: [], chatRateLimitPerMinute: 5 }));
    await chat(app(), forged, { mode: 'grammar', text: 'hi', conversationId: null }).expect(401);
  });
});

describe('POST /api/chat', () => {
  it('returns a schema-valid reply and saves both messages', async () => {
    const server = app();
    const token = await newUser(server);
    const res = await chat(server, token, { mode: 'grammar', text: 'I am go to office yesterday.', conversationId: null }).expect(200);

    expect(ChatResponseSchema.parse(res.body).result).toEqual(grammarResult);
    expect(coach).toHaveBeenCalledWith({ mode: 'grammar', text: 'I am go to office yesterday.', history: [] });
    expect(await Message.countDocuments({ conversationId: res.body.conversationId })).toBe(2);
    expect((await Conversation.findById(res.body.conversationId))?.title).toBe('I am go to office yesterday.');
  });

  it('passes earlier turns of the same conversation to the coach', async () => {
    const server = app();
    const token = await newUser(server);
    coach.mockResolvedValue(conversationResult);
    const first = await chat(server, token, { mode: 'conversation', text: 'I like books.', conversationId: null }).expect(200);
    await chat(server, token, { mode: 'conversation', text: 'Novels.', conversationId: first.body.conversationId }).expect(200);

    expect(coach.mock.calls[1][0].history).toEqual([
      { role: 'user', text: 'I like books.' },
      { role: 'assistant', result: conversationResult },
    ]);
  });

  it("does not let one user use another user's conversation", async () => {
    const server = app();
    const owner = await newUser(server);
    const intruder = await newUser(server);
    const res = await chat(server, owner, { mode: 'grammar', text: 'private', conversationId: null }).expect(200);

    await chat(server, intruder, { mode: 'grammar', text: 'x', conversationId: res.body.conversationId }).expect(404);
    expect(await Message.countDocuments({ conversationId: res.body.conversationId })).toBe(2);
  });

  it.each([
    ['empty text', { mode: 'grammar', text: '   ', conversationId: null }],
    ['too long text', { mode: 'grammar', text: 'a'.repeat(MAX_INPUT_LENGTH + 1), conversationId: null }],
    ['unknown mode', { mode: 'poetry', text: 'hi', conversationId: null }],
    ['missing fields', { text: 'hi' }],
  ])('rejects %s with 400 without calling the AI', async (_name, body) => {
    const server = app();
    const res = await chat(server, await newUser(server), body).expect(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(coach).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400', async () => {
    const server = app();
    await request(server)
      .post('/api/chat')
      .set('Authorization', `Bearer ${await newUser(server)}`)
      .set('Content-Type', 'application/json')
      .send('{"mode":')
      .expect(400);
  });

  it('returns 503 and saves nothing when the AI is unavailable', async () => {
    const server = app();
    const token = await newUser(server);
    coach.mockRejectedValue(new AiError('unavailable', 'down'));

    const res = await chat(server, token, { mode: 'grammar', text: 'hi', conversationId: null }).expect(503);
    expect(res.body.error).toMatch(/unavailable/i);
    expect(await Conversation.countDocuments()).toBe(0);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('returns 502 when the AI output is invalid', async () => {
    const server = app();
    coach.mockRejectedValue(new AiError('invalid_output', 'bad'));
    await chat(server, await newUser(server), { mode: 'grammar', text: 'hi', conversationId: null }).expect(502);
  });

  it('rate limits each user separately', async () => {
    const server = app(2);
    const a = await newUser(server);
    const b = await newUser(server);
    const body = { mode: 'grammar', text: 'hi', conversationId: null };

    await chat(server, a, body).expect(200);
    await chat(server, a, body).expect(200);
    await chat(server, a, body).expect(429);
    await chat(server, b, body).expect(200);
  });
});
