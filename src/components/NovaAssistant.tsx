import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, X, Volume2 } from 'lucide-react';
import { apiClient } from '../lib/api';

const NovaAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Welcome to the Diner. I'm Nova, your smart assistant. How can I help you today?" }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = async (text: string) => {
    try {
      const response = await fetch(`https://koola10-tts.fly.dev/api/tts?text=${encodeURIComponent(text)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      } else {
        // Fallback to Web Speech API if remote TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.chat([
        { role: 'user', content: `Context: We are in the Koola10 Diner. ${text}` }
      ], 'nova');

      const reply = response.response;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (error) {
      const errorMsg = "I'm having trouble connecting to the neural network.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-14 right-6 w-14 h-14 bg-koola-cyan rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.6)] hover:scale-110 transition-transform z-40"
      >
        <Mic className={isListening ? 'animate-pulse text-red-600' : 'text-black'} size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-32 right-6 w-80 h-96 bg-black/90 border border-koola-cyan/30 rounded-2xl flex flex-col backdrop-blur-xl z-40 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-koola-cyan/20 flex justify-between items-center bg-koola-cyan/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-koola-cyan tracking-widest uppercase">Nova Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-koola-cyan/60 hover:text-koola-cyan">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                  msg.role === 'user'
                    ? 'bg-koola-cyan/20 text-koola-cyan rounded-tr-none'
                    : 'bg-white/10 text-gray-300 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none animate-pulse">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="p-4 border-t border-koola-cyan/20 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Nova..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-koola-cyan/50 text-white"
            />
            <button
              type="button"
              onClick={toggleListen}
              className={`p-2 rounded-lg ${isListening ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-400'}`}
            >
              <Mic size={16} />
            </button>
            <button
              type="submit"
              className="p-2 bg-koola-cyan/20 text-koola-cyan rounded-lg hover:bg-koola-cyan/30"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default NovaAssistant;
