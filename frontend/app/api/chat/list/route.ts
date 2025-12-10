// list all chats endpoint
import { listChats } from '@/lib/chat-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId') || undefined;
    
    const chats = await listChats(fileId);
    return new Response(
      JSON.stringify({ chats }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('error listing chats:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


