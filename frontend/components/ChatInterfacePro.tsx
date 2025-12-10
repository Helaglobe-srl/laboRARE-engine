'use client'

import { useState, useRef, useEffect } from 'react'
import { type Message, listDocuments, type FileMetadata } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatInterfaceProProps {
  fileId: string
  chatId: string | null
  onChatIdChange: (chatId: string) => void
}

export default function ChatInterfacePro({ fileId, chatId: propChatId, onChatIdChange }: ChatInterfaceProProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(propChatId)
  const [documents, setDocuments] = useState<FileMetadata[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string>(fileId)
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // load documents for file selector
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const result = await listDocuments()
        setDocuments(result.files)
      } catch (err) {
        console.error('failed to load documents:', err)
      }
    }
    loadDocs()
  }, [])

  // update selected file when prop changes
  useEffect(() => {
    setSelectedFileId(fileId)
  }, [fileId])

  // handle chat loading or creation
  useEffect(() => {
    // don't reload if we're in the middle of creating a new chat
    if (isCreatingChat) {
      return
    }
    
    const initChat = async () => {
      if (propChatId) {
        // load existing chat
        try {
          const response = await fetch(`/api/chat/${propChatId}`)
          const data = await response.json()
          setMessages(data.messages || [])
          setChatId(propChatId)
          setError(null)
        } catch (err) {
          console.error('failed to load chat:', err)
        }
      } else {
        // no chat selected - show empty state
        setChatId(null)
        setMessages([])
        setError(null)
      }
    }
    
    initChat()
    inputRef.current?.focus()
  }, [propChatId, selectedFileId, isCreatingChat])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    }

    // optimistically add user message
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // create chat if it doesn't exist
      let activeChatId = chatId
      if (!activeChatId) {
        setIsCreatingChat(true)
        const response = await fetch('/api/chat/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: selectedFileId }),
        })
        const data = await response.json()
        activeChatId = data.chatId
        setChatId(activeChatId)
        onChatIdChange(activeChatId)
      }
      // call streaming chat api
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          chatId: activeChatId,
          fileId: selectedFileId,
        }),
      })

      if (!response.ok) {
        throw new Error(`api error: ${response.statusText}`)
      }

      // handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('no reader available')
      }

      let assistantContent = ''
      
      // add empty assistant message that we'll update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.content) {
              assistantContent += data.content
              // update the last message (assistant) with new content
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                }
                return newMessages
              })
            } else if (data.error) {
              throw new Error(data.error)
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'failed to get response')
      // remove the user message and partial assistant message if the request failed
      setMessages(prev => {
        const newMessages = [...prev]
        // remove assistant message if it exists
        if (newMessages[newMessages.length - 1]?.role === 'assistant') {
          newMessages.pop()
        }
        // remove user message
        newMessages.pop()
        return newMessages
      })
      setInput(userMessage.content) // restore the input
    } finally {
      setIsLoading(false)
      setIsCreatingChat(false)
      inputRef.current?.focus()
    }
  }

  const handleClearChat = async () => {
    if (confirm('clear this conversation?')) {
      // create a new chat
      try {
        const response = await fetch('/api/chat/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: selectedFileId }),
        })
        const data = await response.json()
        const newChatId = data.chatId
        setChatId(newChatId)
        onChatIdChange(newChatId)
        setMessages([])
        setError(null)
        inputRef.current?.focus()
      } catch (err) {
        console.error('failed to create new chat:', err)
      }
    }
  }

  const suggestedQuestions = [
    'what is this document about?',
    'summarize the main points',
    'what are the key findings?',
    'list the important dates mentioned',
  ]

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                document assistant
              </h2>
            </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>clear</span>
          </button>
        )}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                ask me anything about your document
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question)}
                  className="p-4 text-left text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md group"
                >
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      {question}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex items-start space-x-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                  }`}>
                    {message.role === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* message bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}>
                    {message.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start space-x-3 max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center animate-fade-in">
                <div className="max-w-md p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-400">
                        something went wrong
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* file selector */}
        <div className="mb-3 relative">
          <button
            onClick={() => setShowFileSelector(!showFileSelector)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              {documents.find(d => d.id === selectedFileId)?.filename || 'select document'}
            </span>
            <svg className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${showFileSelector ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showFileSelector && (
            <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-10">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  no documents available
                </div>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedFileId(doc.id)
                      setShowFileSelector(false)
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                      selectedFileId === doc.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {doc.bytes && doc.bytes > 0 && `${(doc.bytes / (1024 * 1024)).toFixed(1)} mb • `}
                          {new Date(doc.created_at * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedFileId === doc.id && (
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="type your question..."
              className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {input.length > 0 && `${input.length}`}
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center space-x-2 font-medium"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>sending</span>
              </>
            ) : (
              <>
                <span>send</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          ai can make mistakes. verify important information.
        </p>
      </div>
    </div>
  )
}

