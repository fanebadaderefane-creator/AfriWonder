import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/expressClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FixedSizeList as VirtualList } from "react-window";
import { cacheConversations, getCachedConversations, cacheMessages, getCachedMessages } from "@/services/offlineProfilesMessages.service";
import { impactMedium } from "@/lib/haptics";

const NEW_PREFIX = "new-";

export default function MessagesMaliConnect() {
  const navigate = useNavigate();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const providerIdFromUrl = params.get("provider");
  const [user, setUser] = useState(null);
  const [activeConvoId, setActiveConvoId] = useState(() => params.get("conversation") || (providerIdFromUrl ? `${NEW_PREFIX}${providerIdFromUrl}` : null));
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => { navigate("/Landing", { replace: true }); });
  }, [navigate]);

  const { data: providerFromUrl } = useQuery({
    queryKey: ["provider", providerIdFromUrl],
    queryFn: () => api.providers.getById(providerIdFromUrl),
    enabled: !!providerIdFromUrl,
  });

  const { data: conversationsData, isLoading: loadingConvos } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const cached = await getCachedConversations(user.id);
      let convos = cached?.conversations || [];
      try {
        const fresh = await api.messages.getConversations(1, 50);
        convos = fresh?.conversations ?? (Array.isArray(fresh) ? fresh : []);
        cacheConversations(user.id, convos).catch(() => {});
      } catch {
        // hors-ligne : rester sur le cache
      }
      return { conversations: convos };
    },
  });

  const conversations = conversationsData?.conversations ?? (Array.isArray(conversationsData) ? conversationsData : []);
  const isNewConvo = activeConvoId && String(activeConvoId).startsWith(NEW_PREFIX);
  const newProviderId = isNewConvo ? String(activeConvoId).slice(NEW_PREFIX.length) : null;

  const providerName = providerFromUrl?.display_name ?? providerFromUrl?.user?.full_name ?? providerFromUrl?.user?.username ?? "Prestataire";
  const providerUserId = providerFromUrl?.user_id ?? providerFromUrl?.user?.id;

  const newConvoEntry = providerIdFromUrl && providerName
    ? { id: `${NEW_PREFIX}${providerIdFromUrl}`, isNew: true, otherUser: { id: providerUserId, full_name: providerName, display_name: providerName }, last_message: "Nouvelle conversation" }
    : null;

  const displayList = [...conversations];
  if (newConvoEntry && !displayList.some((c) => c.id === newConvoEntry.id)) {
    displayList.unshift(newConvoEntry);
  }

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", activeConvoId],
    enabled: !!activeConvoId && !isNewConvo,
    refetchInterval: 3000,
    queryFn: async () => {
      const cached = await getCachedMessages(activeConvoId);
      let msgs = cached?.messages || [];
      try {
        const fresh = await api.messages.getMessages(activeConvoId);
        msgs = fresh?.messages ?? (Array.isArray(fresh) ? fresh : []);
        cacheMessages(activeConvoId, msgs).catch(() => {});
      } catch {
        // hors-ligne
      }
      return { messages: msgs };
    },
  });

  const messages = isNewConvo ? [] : (messagesData?.messages ?? (Array.isArray(messagesData) ? messagesData : []));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConvoId && user && !isNewConvo) {
      api.messages.markAsRead(activeConvoId).catch(() => {});
    }
  }, [activeConvoId, user, isNewConvo]);

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    let recipientId = null;
    if (isNewConvo && newProviderId) {
      recipientId = providerUserId;
      if (!recipientId && providerFromUrl) recipientId = providerFromUrl.user?.id ?? providerFromUrl.user_id;
    } else {
      const activeConvo = conversations.find((c) => c.id === activeConvoId);
      recipientId = activeConvo?.otherUser?.id ?? activeConvo?.participant?.id ?? activeConvo?.userId;
    }
    if (!recipientId) return;
    setSending(true);
    try {
      await api.messages.send(recipientId, messageText.trim());
      impactMedium().catch(() => {});
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      if (!isNewConvo) queryClient.invalidateQueries({ queryKey: ["messages", activeConvoId] });
    } catch (_) {}
    setSending(false);
  };

  const activeConvo = displayList.find((c) => c.id === activeConvoId);

  const getOtherName = (convo) => {
    const other = convo?.otherUser ?? convo?.participant;
    if (other?.display_name) return other.display_name;
    if (other?.full_name) return other.full_name;
    if (other?.username) return other.username;
    if (other?.email) return other.email;
    return "Utilisateur";
  };

  const getUnread = (convo) => (convo?.isNew ? 0 : (convo?.unreadCount ?? convo?.unread_count ?? 0));
  const getSubtitle = (convo) => convo?.lastMessage?.content ?? convo?.last_message ?? "Nouvelle conversation";

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 min-h-screen bg-[#0b0b0f] text-white">
      <div
        className="bg-[#11131a] rounded-2xl border border-white/10 shadow-sm overflow-hidden"
        style={{ minHeight: "calc(100vh - 160px)", height: "calc(100vh - 160px)" }}
        role="main"
        aria-label="Messagerie AfriWonder"
      >
        <div className="grid md:grid-cols-[320px_1fr] h-full">
          {/* Panneau gauche : liste des conversations — comme sur la capture 2 */}
          <div className={`border-r border-white/10 flex flex-col bg-[#0f1016] ${activeConvoId ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="font-bold text-white" aria-label="Liste des conversations">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : displayList.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageCircle className="w-10 h-10 text-white/45 mx-auto mb-3" />
                  <p className="text-sm text-white/60">Aucune conversation</p>
                </div>
              ) : (
                <VirtualList
                  height={400}
                  itemCount={displayList.length}
                  itemSize={72}
                  width="100%"
                >
                  {({ index, style }) => {
                    const convo = displayList[index];
                    const unread = getUnread(convo);
                    const isActive = activeConvoId === convo.id;
                    return (
                      <button
                        key={convo.id}
                        onClick={() => setActiveConvoId(convo.id)}
                        className={`w-full text-left border-b border-white/10 hover:bg-white/5 transition-colors ${isActive ? "bg-white/10" : ""}`}
                        style={style}
                        aria-label={`Ouvrir la conversation avec ${getOtherName(convo)}`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {(getOtherName(convo) || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white truncate">{getOtherName(convo)}</p>
                            <p className="text-xs text-white/60 truncate mt-0.5">{getSubtitle(convo)}</p>
                          </div>
                          {unread > 0 && (
                            <span className="bg-[#ff2f6d] text-white text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">{unread}</span>
                          )}
                        </div>
                      </button>
                    );
                  }}
                </VirtualList>
              )}
            </div>
          </div>

          {/* Panneau droit : conversation ouverte — comme sur la capture 2 */}
          <div className={`flex flex-col ${!activeConvoId ? "hidden md:flex" : "flex"}`}>
            {activeConvo ? (
              <>
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0f1016]">
                  <button
                    type="button"
                    onClick={() => setActiveConvoId(null)}
                    className="md:hidden p-1 rounded-lg hover:bg-white/10"
                    aria-label="Revenir à la liste des conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {(getOtherName(activeConvo) || "?")[0].toUpperCase()}
                  </div>
                  <p className="font-semibold text-white">{getOtherName(activeConvo)}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-[#0b0b0f]">
                  {loadingMessages && !isNewConvo ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-white/60">Commencez la conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isMe = msg.senderId === user.id || msg.sender_id === user.id || msg.sender_email === user.email;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-gradient-to-r from-[#ff2f6d] to-[#ff5f8f] text-white rounded-br-md" : "bg-[#191b23] border border-white/10 text-white rounded-bl-md"}`}>
                              {msg.content}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-white/10 bg-[#0f1016]">
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1 rounded-xl bg-[#191b23] border-white/10 text-white placeholder:text-white/50"
                    />
                    <Button
                      type="submit"
                      disabled={!messageText.trim() || sending}
                      className="rounded-xl bg-[#ff2f6d] hover:bg-[#ff4b80] text-white h-11 px-4"
                      aria-label="Envoyer le message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center bg-[#0b0b0f]">
                <div>
                  <MessageCircle className="w-12 h-12 text-white/45 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
