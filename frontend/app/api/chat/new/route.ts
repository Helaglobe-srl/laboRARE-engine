// create new chat endpoint
import { createChat } from '@/lib/chat-store';

export async function POST(req: Request) {
  try {
    const { fileId } = await req.json();
    
    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'fileId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const chatId = await createChat(fileId);
    return new Response(
      JSON.stringify({ chatId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('error creating chat:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

