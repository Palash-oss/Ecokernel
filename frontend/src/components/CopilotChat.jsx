import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, ShieldCheck, Zap, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CopilotChat.css';

const QUICK_PROMPTS = [
  "How to lower Scope 3 emissions?",
  "Compare Rail vs Euro 6 Diesel",
  "What is QIGA-PIEP algorithm?",
  "Calculate EU CBAM carbon impact"
];

const renderFormattedText = (text) => {
  if (!text) return null;

  // Simple markdown-style line renderer
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let content = line;
    
    // Header check
    if (content.startsWith('### ')) {
      return <h4 key={idx} className="copilot-md-h4">{content.replace('### ', '')}</h4>;
    }
    if (content.startsWith('## ')) {
      return <h3 key={idx} className="copilot-md-h3">{content.replace('## ', '')}</h3>;
    }

    // Bold replacement (**text**)
    const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="text-emerald-300 font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pIdx} className="copilot-code-tag">{part.slice(1, -1)}</code>;
      }
      return part;
    });

    if (content.trim().startsWith('- ') || content.trim().startsWith('1. ') || content.trim().startsWith('2. ')) {
      return <div key={idx} className="copilot-list-item">{formattedParts}</div>;
    }

    return <p key={idx} className="copilot-paragraph">{formattedParts}</p>;
  });
};

const CopilotChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Greetings! I am **EcoCopilot AI**. Connected to EcoKernel's live logistics telemetry, GLEC v3.0 standards, and EU CBAM regulatory compliance rules. Ask me anything!",
      sender: 'bot',
      engine: 'PHYSICS_RAG_ENGINE'
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeEngine, setActiveEngine] = useState("AI COPILOT");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendPrompt = (promptText) => {
    setInput(promptText);
    executeSendMessage(promptText);
  };

  const executeSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isTyping) return;

    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8001/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: "user_session",
          active_priority: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setActiveEngine(data.engine || "AI COPILOT");

      const botMsg = {
        id: Date.now() + 1,
        text: data.response,
        sender: 'bot',
        engine: data.engine
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.warn("Copilot API offline, using fallback response:", err);
      const fallbackMsg = {
        id: Date.now() + 1,
        text: "### 🌿 EcoCopilot Offline Mode\nSystem telemetry indicates active optimization runs. Shifting line-hauls from **Euro 6 Diesel** to **Electrified Rail** saves up to **85% CO₂ emissions**.",
        sender: 'bot',
        engine: 'OFFLINE_FALLBACK'
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="copilot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X color="#69f6b8" size={22} /> : <Bot color="#69f6b8" size={22} />}
        <span className="glow-ring"></span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="copilot-overlay"
            initial={{ y: 20, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.25 }}
          >
            <div className="copilot-header">
              <div className="flex-center gap-2">
                <Bot size={20} color="#69f6b8" />
                <span className="copilot-header-title">EcoCopilot RAG AI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="copilot-engine-badge">
                  <Cpu size={12} className="inline mr-1 text-emerald-400" />
                  {activeEngine}
                </span>
                <span className="status-dot-active">ONLINE</span>
              </div>
            </div>
            
            <div className="copilot-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <div className="msg-icon">
                    {msg.sender === 'bot' ? <Bot size={14} color="#69f6b8" /> : <User size={14} color="#38bdf8" />}
                  </div>
                  <div className="msg-text">
                    {msg.sender === 'bot' ? renderFormattedText(msg.text) : msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-bubble bot typing-indicator">
                  <Bot size={14} color="#69f6b8" />
                  <span>EcoCopilot is querying supply chain context...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="copilot-prompts-bar">
              {QUICK_PROMPTS.map((p, idx) => (
                <button key={idx} className="quick-prompt-btn" onClick={() => handleSendPrompt(p)}>
                  {p}
                </button>
              ))}
            </div>

            <div className="copilot-input">
              <input 
                placeholder="Ask logistics copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && executeSendMessage()}
              />
              <button onClick={() => executeSendMessage()} className="send-btn" disabled={isTyping}>
                <Send size={16} color="#69f6b8" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CopilotChat;

