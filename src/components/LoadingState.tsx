import React from 'react'

const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 border-2 border-koola-cyan/30 rounded-full animate-pulse"></div>
        <div className="absolute inset-2 border-2 border-transparent border-t-koola-cyan border-r-koola-cyan rounded-full animate-spin"></div>
      </div>
      <p className="text-koola-cyan animate-pulse">{message}</p>
    </div>
  )
}

export default LoadingState
