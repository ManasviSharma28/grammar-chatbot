import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    kind: { type: String, enum: ['anonymous'], required: true },
    trackProgress: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 80 },
  },
  { timestamps: true }
);
ConversationSchema.index({ userId: 1, updatedAt: -1 });

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    mode: { type: String, required: true },
    text: { type: String },
    /** Validated AssistantResult JSON for assistant messages. */
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const User = mongoose.model('User', UserSchema);
export const Conversation = mongoose.model('Conversation', ConversationSchema);
export const Message = mongoose.model('Message', MessageSchema);
export type MessageDoc = InferSchemaType<typeof MessageSchema>;

/** Connects to MONGODB_URI, or to a throwaway in-memory server when none is given (dev/test only). */
export async function connectDatabase(uri: string | undefined): Promise<() => Promise<void>> {
  let memoryServer: { getUri(): string; stop(): Promise<boolean> } | null = null;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.warn('[db] MONGODB_URI not set — using an in-memory MongoDB. Data will be lost on restart.');
  }
  await mongoose.connect(uri);
  return async () => {
    await mongoose.disconnect();
    await memoryServer?.stop();
  };
}
