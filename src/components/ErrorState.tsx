import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  error: string
  onRetry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <AlertCircle size={48} className="text-red-400 mb-4" />
      <p className="text-red-400 text-center mb-4 max-w-md">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export default ErrorState
