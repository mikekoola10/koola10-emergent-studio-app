import React from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message: string
  icon?: React.ReactNode
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon || <Inbox size={48} className="text-koola-cyan/40 mb-4" />}
      <p className="text-gray-400 text-center max-w-md">{message}</p>
    </div>
  )
}

export default EmptyState
