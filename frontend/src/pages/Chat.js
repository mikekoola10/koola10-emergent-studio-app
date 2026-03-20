import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChatMessage from '../components/ChatMessage';
import { chatAPI, episodesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    loadChatHistory();
  }, [currentEpisode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(currentEpisode?.id, 100);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        content: userMessage,
        role: 'user',
        episode_id: currentEpisode?.id,
      });

      // Reload messages to get both user message and AI response
      await loadChatHistory();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveAsEpisode = async (content) => {
    try {
      // Try to extract title from content
      const lines = content.split('\n');
      const titleLine = lines.find(line => line.toLowerCase().includes('title:') || line.toLowerCase().includes('episode'));
      const title = titleLine ? titleLine.replace(/title:/i, '').trim() : 'New Episode';

      const newEpisode = await episodesAPI.create({
        title,
        season: 1,
        episode_number: 1,
        description: content.substring(0, 200),
        master_prompt: content,
      });

      setCurrentEpisode(newEpisode.data);
      alert('Episode created successfully!');
    } catch (error) {
      console.error('Failed to create episode:', error);
      alert('Failed to create episode');
    }
  };

  const handleSaveAsScene = async (content) => {
    if (!currentEpisode) {
      alert('Please select or create an episode first');
      return;
    }

    // This would open a modal or form to create a scene
    alert('Scene creation modal would open here with the content pre-filled');
  };

  const handleGeneratePrompt = async (content) => {
    setLoading(true);
    try {
      const response = await chatAPI.generatePrompt(content);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: response.data.prompt,
          role: 'assistant',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Chat Workspace" subtitle="Collaborate with AI to build your video scripts and prompts" />

        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto" data-testid="chat-messages-container">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">Start a conversation</p>
                    <p className="text-sm">Paste your script, ask for help, or generate prompts</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onSaveAsEpisode={handleSaveAsEpisode}
                      onSaveAsScene={handleSaveAsScene}
                      onGeneratePrompt={handleGeneratePrompt}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-4">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    data-testid="chat-input"
                    placeholder="Type your message or paste your script here..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    data-testid="send-message-btn"
                    disabled={loading || !input.trim()}
                    className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Context Panel */}
          <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Context</h3>

            {currentEpisode ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Episode</p>
                  <p className="font-semibold text-gray-900">{currentEpisode.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    S{String(currentEpisode.season).padStart(2, '0')}E{String(currentEpisode.episode_number).padStart(2, '0')}
                  </p>
                </div>

                <button
                  onClick={() => setCurrentEpisode(null)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Clear selection
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No episode selected</p>
            )}

            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Style Rules</h4>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-purple-50 rounded">
                  <span className="font-semibold">Punchline</span> → Boondocks
                </div>
                <div className="p-2 bg-pink-50 rounded">
                  <span className="font-semibold">Reaction</span> → 4K
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <span className="font-semibold">Bell rings</span> → Boondocks
                </div>
                <div className="p-2 bg-pink-50 rounded">
                  <span className="font-semibold">Emotional beat</span> → 4K
                </div>
                <div className="p-2 bg-pink-50 rounded">
                  <span className="font-semibold">Magic pulse</span> → 4K slow-mo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
