// chat api route with message persistence
import { NextRequest } from 'next/server';
import { loadChat, saveChat, UIMessage } from '@/lib/chat-store';
import { generateId } from 'ai';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const { message, chatId, fileId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'no document selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // load previous messages from storage
    const previousMessages = await loadChat(chatId);

    // create new user message
    const userMessage: UIMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      createdAt: new Date(),
    };

    // append new message to previous messages
    const updatedMessages = [...previousMessages, userMessage];

    // apply sliding window: keep only last 4 messages + current query (5 total)
    // this limits context to recent conversation and reduces token usage
    const MAX_HISTORY_MESSAGES = 4; // 4 previous messages
    const TOTAL_MESSAGES = MAX_HISTORY_MESSAGES + 1; // + 1 for current query = 5 total
    
    const messagesToSend = updatedMessages.length > TOTAL_MESSAGES
      ? updatedMessages.slice(-TOTAL_MESSAGES)
      : updatedMessages;

    // call backend api for qa with conversation history
    const response = await fetch(`${BACKEND_URL}/qa/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: fileId,
        messages: messagesToSend.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`backend error: ${response.statusText}`);
    }

    const data = await response.json();

    // create assistant message
    const assistantMessage: UIMessage = {
      id: generateId(),
      role: 'assistant',
      content: data.answer,
      createdAt: new Date(),
    };

    // save complete conversation
    const finalMessages = [...updatedMessages, assistantMessage];
    await saveChat({ chatId, messages: finalMessages });

    // return the assistant message
    return new Response(
      JSON.stringify({ message: assistantMessage, allMessages: finalMessages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('chat error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

