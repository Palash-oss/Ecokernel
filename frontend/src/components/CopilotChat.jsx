import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CopilotChat.css';

const QUICK_PROMPTS = [
  "How to lower Scope 3 emissions?",
  "Compare Rail vs Euro 6 Diesel",
  "What is QIGA-PIEP algorithm?",
  "Calculate EU CBAM carbon impact"
];

const LOGISTICS_KNOWLEDGE = {
  scope3: "Scope 3 emissions in logistics are reduced by shift to electrified freight rail corridors, adopting Euro-6/CNG heavy goods vehicles, optimizing multi-objective Pareto trade-offs (priority > 0.7), and eliminating cold-start idling penalties.",
  rail: "Rail Freight emits ~0.005 kg CO₂/tonne-km compared to Road Euro-6 Diesel (~0.168 kg CO₂/tonne-km). Switching intercity line-hauls (e.g., Mumbai→Delhi) to electrified rail reduces carbon footprint by ~85% while cutting long-haul operational cost by 40%.",
  qiga: "QIGA-PIEP (Quantum-Inspired Genetic Algorithm with Physics Energy Profiling) utilizes quantum bit superposition states (|Ψ⟩ = α|0⟩ + β|1⟩) updated via rotation gates (Δθ) to achieve 4.8x faster convergence on multi-objective cost vs. carbon Pareto frontiers.",
  cbam: "The EU Carbon Border Adjustment Mechanism (CBAM) levies carbon tariffs on imported goods based on Scope 1, 2, and 3 embedded emissions. EcoKernel's audit-ready reporting helps enterprise supply chains document carbon intensity reductions to mitigate CBAM tax liabilities."
};

const CopilotChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Greetings, Enterprise Logistics Manager. I am EcoCopilot AI. Ask me about Scope 3 compliance, QIGA quantum optimization, or multi-modal fleet strategies.", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  const executeSendMessage = (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "Analyzing logistics telemetry... For maximum green score, consider increasing optimization priority slider to 80% Green and using multi-modal electrified rail for corridors > 300km.";
      const lower = text.toLowerCase();
      if (lower.includes("scope") || lower.includes("emission")) reply = LOGISTICS_KNOWLEDGE.scope3;
      else if (lower.includes("rail") || lower.includes("diesel")) reply = LOGISTICS_KNOWLEDGE.rail;
      else if (lower.includes("qiga") || lower.includes("quantum") || lower.includes("algorithm")) reply = LOGISTICS_KNOWLEDGE.qiga;
      else if (lower.includes("cbam") || lower.includes("tax") || lower.includes("eu")) reply = LOGISTICS_KNOWLEDGE.cbam;

      const botMsg = { id: Date.now() + 1, text: reply, sender: 'bot' };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
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
                <span className="copilot-header-title">EcoCopilot AI Assistant</span>
              </div>
              <span className="status-dot-active">ONLINE</span>
            </div>
            
            <div className="copilot-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <div className="msg-icon">
                    {msg.sender === 'bot' ? <Bot size={14} color="#69f6b8" /> : <User size={14} color="#38bdf8" />}
                  </div>
                  <div className="msg-text">{msg.text}</div>
                </div>
              ))}
              {isTyping && (
                <div className="message-bubble bot typing-indicator">
                  <Bot size={14} color="#69f6b8" />
                  <span>EcoCopilot is thinking...</span>
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
              <button onClick={() => executeSendMessage()} className="send-btn">
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
