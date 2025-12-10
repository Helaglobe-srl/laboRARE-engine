// delete chat endpoint
import { deleteChat } from '@/lib/chat-store';

export async function DELETE(req: Request) {
  try {
    const { chatId } = await req.json();
    
    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'chatId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    await deleteChat(chatId);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('error deleting chat:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


