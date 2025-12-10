'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatInterfacePro from '@/components/ChatInterfacePro'
import DocumentsPanel from '@/components/DocumentsPanel'

export default function Home() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeView, setActiveView] = useState<'chat' | 'documents'>('chat')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleUploadSuccess = (fileId: string) => {
    setSelectedFileId(fileId)
    setCurrentChatId(null) // reset chat when new document uploaded
    setRefreshTrigger(prev => prev + 1)
    setActiveView('chat')
  }

  const handleSelectDocument = (fileId: string) => {
    setSelectedFileId(fileId)
    setCurrentChatId(null) // reset chat when document changed
    setActiveView('chat')
  }

  const handleSelectChat = async (chatId: string) => {
    // load the chat and switch to it
    try {
      const response = await fetch(`/api/chat/${chatId}`)
      const data = await response.json()
      
      // get the chat metadata to know which file it belongs to
      const metaResponse = await fetch(`/api/chat/list`)
      const metaData = await metaResponse.json()
      const chat = metaData.chats.find((c: any) => c.id === chatId)
      
      if (chat) {
        setSelectedFileId(chat.fileId)
        setCurrentChatId(chatId)
        setActiveView('chat')
      }
    } catch (err) {
      console.error('failed to load chat:', err)
    }
  }

  const handleNewChat = () => {
    setCurrentChatId(null)
    setActiveView('chat')
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/chat/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
      
      if (response.ok) {
        // if deleted chat was active, clear it
        if (currentChatId === chatId) {
          setCurrentChatId(null)
        }
        // refresh will happen via sidebar's periodic refresh
      }
    } catch (err) {
      console.error('failed to delete chat:', err)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* sidebar */}
      <Sidebar
        selectedFileId={selectedFileId}
        onSelectDocument={handleSelectDocument}
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' ? (
          selectedFileId ? (
            <ChatInterfacePro 
              fileId={selectedFileId} 
              chatId={currentChatId}
              onChatIdChange={setCurrentChatId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-2xl">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    laboRARE Engine
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                    AI-powered document intelligence
                  </p>
                  <p className="text-gray-500 dark:text-gray-500">
                    select a document from the sidebar or upload a new one to start
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 dark:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          )
        ) : (
          <DocumentsPanel
            onUploadSuccess={handleUploadSuccess}
            onSelectDocument={handleSelectDocument}
            selectedFileId={selectedFileId}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  )
}
