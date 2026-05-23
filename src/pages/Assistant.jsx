import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Bot } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';

export default function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Bonjour ! Je suis l'assistant AfriWonder. Tapez 'reco' pour des vidéos recommandées, 'aide' pour les commandes." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const result = await api.ai.assistant(text);
      const reply = result?.reply ?? 'Désolé, pas de réponse.';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: e?.apiMessage || 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-slate-950/95 border-b border-white/10 flex items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Bot className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-semibold text-primary">Assistant</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2 text-white/70">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          placeholder="Message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-white placeholder:text-white/50"
        />
        <Button size="icon" className="rounded-xl bg-primary" onClick={send} disabled={loading}>
          <Send className="w-5 h-5" />
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
