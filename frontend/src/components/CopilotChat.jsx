import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CopilotChat.css';

const CopilotChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Greetings, Logistics Manager. I am EcoCopilot. How can I optimize your supply chain today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Simulated AI response
    setTimeout(() => {
      const botMsg = { 
        id: Date.now(), 
        text: "Analyzing logistics network... Optimizing Route Efficiency & Carbon Intensity. Processing demand forecast for the next 7 days.", 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  return (
    <>
      <div className="copilot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X color="#69f6b8" /> : <Bot color="#69f6b8" />}
        <span className="glow-ring"></span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="copilot-overlay"
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
          >
            <div className="copilot-header">
              <Bot size={20} color="#69f6b8" />
              <span>EcoCopilot Engine</span>
            </div>
            
            <div className="copilot-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <div className="msg-icon">
                    {msg.sender === 'bot' ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className="msg-text">{msg.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="copilot-input">
              <input 
                placeholder="Ask your logistics copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}><Send size={18} color="#69f6b8" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CopilotChat;
