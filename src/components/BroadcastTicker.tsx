import React, { useState, useEffect, useRef } from 'react';
import { STATIC_MESSAGES } from '../lib/constants';
import { apiClient } from '../lib/api';

const BroadcastTicker: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    // Initialize with some static messages
    setMessages(STATIC_MESSAGES.slice(0, 20));

    const interval = setInterval(async () => {
      countRef.current += 1;
      let newMessage: string;

      if (countRef.current % 5 === 0) {
        try {
          const response = await apiClient.getLoreAnswer("Generate a short, one-sentence live broadcast update for the Koola10 Diner.");
          newMessage = response.answer || (response as any).response;
        } catch (error) {
          newMessage = STATIC_MESSAGES[Math.floor(Math.random() * STATIC_MESSAGES.length)];
        }
      } else {
        newMessage = STATIC_MESSAGES[Math.floor(Math.random() * STATIC_MESSAGES.length)];
      }

      setMessages(prev => [...prev.slice(-49), newMessage]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getMessageColor = (msg: string) => {
    if (msg.includes('Booth 3') || msg.includes('Cyan')) return 'text-koola-cyan';
    if (msg.includes('Booth 7') || msg.includes('Purple') || msg.includes('fracture')) return 'text-purple-400';
    if (msg.includes('Orb 1') || msg.includes('Encourager') || msg.includes('Amber')) return 'text-amber-400';
    if (msg.includes('Orb 2') || msg.includes('Cynic') || msg.includes('Red')) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-10 bg-black/80 backdrop-blur-md border-t border-white/10 z-30 overflow-hidden flex items-center">
      <div className="flex whitespace-nowrap animate-ticker">
        {messages.map((msg, idx) => (
          <span
            key={`${idx}-${msg}`}
            className={`mx-8 text-xs font-mono tracking-widest uppercase ${getMessageColor(msg)}`}
          >
            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
            {msg}
          </span>
        ))}
        {/* Duplicate for infinite loop */}
        {messages.map((msg, idx) => (
          <span
            key={`dup-${idx}-${msg}`}
            className={`mx-8 text-xs font-mono tracking-widest uppercase ${getMessageColor(msg)}`}
          >
            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BroadcastTicker;
