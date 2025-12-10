// streaming chat api route with message persistence
import { NextRequest } from 'next/server';
import { loadChat, saveChat, UIMessage } from '@/lib/chat-store';
import { generateId } from 'ai';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
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

    // call backend api for streaming qa with conversation history
    const response = await fetch(`${BACKEND_URL}/qa/conversation/stream`, {
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

    // create a readable stream that forwards the backend stream and saves the complete message
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        
        try {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            throw new Error('no reader available');
          }

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                
                if (data.content) {
                  fullContent += data.content;
                  // forward to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data.content })}\n\n`));
                } else if (data.done) {
                  // save complete conversation
                  const assistantMessage: UIMessage = {
                    id: generateId(),
                    role: 'assistant',
                    content: fullContent,
                    createdAt: new Date(),
                  };
                  
                  const finalMessages = [...updatedMessages, assistantMessage];
                  await saveChat({ chatId, messages: finalMessages });
                  
                  // send done signal with message count
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, messageCount: finalMessages.length })}\n\n`));
                }
              }
            }
          }
        } catch (error) {
          console.error('streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('chat stream error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

