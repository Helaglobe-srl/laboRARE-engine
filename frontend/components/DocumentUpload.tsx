'use client'

import { useState, useRef } from 'react'
import { uploadDocument } from '@/lib/api'

interface DocumentUploadProps {
  onUploadSuccess: (fileId: string) => void
}

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('only pdf files are supported')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('file size must be less than 50mb')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await uploadDocument(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        onUploadSuccess(result.id)
        setUploadProgress(0)
      }, 500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'failed to upload document')
      setUploadProgress(0)
    } finally {
      setTimeout(() => setUploading(false), 500)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              upload document
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              pdf files up to 50mb
            </p>
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={!uploading ? handleClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleChange}
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`}
                    className="text-blue-500 transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">uploading document...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                drop your pdf here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                or click to browse
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3 animate-fade-in">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

