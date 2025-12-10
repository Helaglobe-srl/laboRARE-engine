'use client'

import DocumentUpload from './DocumentUpload'
import DocumentList from './DocumentList'

interface DocumentsPanelProps {
  onUploadSuccess: (fileId: string) => void
  onSelectDocument: (fileId: string) => void
  selectedFileId: string | null
  refreshTrigger: number
}

export default function DocumentsPanel({
  onUploadSuccess,
  onSelectDocument,
  selectedFileId,
  refreshTrigger,
}: DocumentsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            upload and manage your pdf documents
          </p>
        </div>

        <DocumentUpload onUploadSuccess={onUploadSuccess} />
        
        <DocumentList
          onSelectDocument={onSelectDocument}
          selectedFileId={selectedFileId}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  )
}
