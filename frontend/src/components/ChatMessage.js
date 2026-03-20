import React from 'react';
import { User, Bot } from 'lucide-react';

const ChatMessage = ({ message, onSaveAsEpisode, onSaveAsScene, onGeneratePrompt }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex space-x-4 p-4 ${
        isUser ? 'bg-white' : 'bg-gray-50'
      }`}
      data-testid="chat-message"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-purple-100' : 'bg-pink-100'
        }`}
      >
        {isUser ? <User size={20} className="text-purple-600" /> : <Bot size={20} className="text-pink-600" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-gray-900">{isUser ? 'You' : 'AI Assistant'}</span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{message.content}</div>
        {isUser && (
          <div className="flex space-x-2 mt-3">
            <button
              onClick={() => onSaveAsEpisode(message.content)}
              data-testid="save-as-episode-btn"
              className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
              Save as Episode
            </button>
            <button
              onClick={() => onSaveAsScene(message.content)}
              data-testid="save-as-scene-btn"
              className="px-3 py-1 text-xs bg-pink-100 text-pink-700 rounded hover:bg-pink-200 transition-colors"
            >
              Save as Scene
            </button>
            <button
              onClick={() => onGeneratePrompt(message.content)}
              data-testid="generate-prompt-btn"
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Generate Emergent Prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
