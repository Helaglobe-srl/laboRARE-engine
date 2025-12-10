'use client'

import { useState, useEffect } from 'react'
import { listDocuments, deleteDocument, type FileMetadata } from '@/lib/api'

interface DocumentListProps {
  onSelectDocument: (fileId: string) => void
  selectedFileId: string | null
  refreshTrigger: number
}

export default function DocumentList({ 
  onSelectDocument, 
  selectedFileId,
  refreshTrigger 
}: DocumentListProps) {
  const [documents, setDocuments] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listDocuments()
      setDocuments(result.files)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [refreshTrigger])

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('delete this document?')) {
      return
    }

    setDeletingId(fileId)
    try {
      await deleteDocument(fileId)
      setDocuments(docs => docs.filter(doc => doc.id !== fileId))
      if (selectedFileId === fileId) {
        onSelectDocument('')
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return null
    if (bytes < 1024) return bytes + ' b'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kb'
    return (bytes / (1024 * 1024)).toFixed(1) + ' mb'
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                your documents
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </p>
            </div>
          </div>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="refresh"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-500"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">loading documents...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400">error loading documents</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">no documents yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">upload your first pdf to get started</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 animate-fade-in ${
                  selectedFileId === doc.id
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 ring-2 ring-blue-500 shadow-md'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="flex items-start space-x-3">
                  {/* pdf icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedFileId === doc.id
                      ? 'bg-blue-500'
                      : 'bg-red-500'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  {/* file info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      selectedFileId === doc.id
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {doc.filename}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {formatFileSize(doc.bytes) && (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.bytes)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                        </>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* delete button */}
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="delete"
                  >
                    {deletingId === doc.id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* selected indicator */}
                {selectedFileId === doc.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

