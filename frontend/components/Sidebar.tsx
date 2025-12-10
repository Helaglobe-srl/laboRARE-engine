'use client'

import { useState, useEffect } from 'react'
import { listDocuments, type FileMetadata } from '@/lib/api'

interface ChatMetadata {
  id: string
  title: string
  fileId: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

interface SidebarProps {
  selectedFileId: string | null
  onSelectDocument: (fileId: string) => void
  activeView: 'chat' | 'documents'
  onViewChange: (view: 'chat' | 'documents') => void
  collapsed: boolean
  onToggleCollapse: () => void
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
}

export default function Sidebar({
  selectedFileId,
  onSelectDocument,
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: SidebarProps) {
  const [documents, setDocuments] = useState<FileMetadata[]>([])
  const [chats, setChats] = useState<ChatMetadata[]>([])
  const [loading, setLoading] = useState(true)

  const loadDocuments = async () => {
    try {
      const result = await listDocuments()
      setDocuments(result.files)
    } catch (err) {
      console.error('failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chat/list')
      const data = await response.json()
      setChats(data.chats || [])
    } catch (err) {
      console.error('failed to load chats:', err)
    }
  }

  useEffect(() => {
    loadDocuments()
    loadChats()
    const interval = setInterval(() => {
      loadDocuments()
      loadChats()
    }, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // reload chats when view changes to chat
  useEffect(() => {
    if (activeView === 'chat') {
      loadChats()
    }
  }, [activeView])

  const selectedDoc = documents.find(doc => doc.id === selectedFileId)

  if (collapsed) {
    return (
      <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-white">laboRARE</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* navigation */}
        <div className="space-y-1">
          <button
            onClick={() => onViewChange('chat')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeView === 'chat'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium">chat</span>
          </button>
          <button
            onClick={() => onViewChange('documents')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeView === 'documents'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">documents</span>
            {documents.length > 0 && (
              <span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* chat history */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500">chat history</div>
            <button
              onClick={onNewChat}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="new chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>no chats yet</p>
              <p className="text-xs mt-1">select a document to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => {
                const chatDoc = documents.find(d => d.id === chat.fileId)
                return (
                  <div
                    key={chat.id}
                    className={`relative rounded-lg transition-colors group ${
                      currentChatId === chat.id
                        ? 'bg-gray-800'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <button
                      onClick={() => onSelectChat(chat.id)}
                      className={`w-full text-left p-3 pr-10 ${
                        currentChatId === chat.id
                          ? 'text-white'
                          : 'text-gray-400 group-hover:text-white'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chat.title}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {chatDoc?.filename || 'unknown document'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(chat.updatedAt).toLocaleDateString()}
                            {chat.messageCount > 0 && ` • ${chat.messageCount} msgs`}
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    {/* delete button - shows on hover */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('delete this chat?')) {
                          await onDeleteChat(chat.id)
                          // refresh chat list immediately
                          loadChats()
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="delete chat"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

