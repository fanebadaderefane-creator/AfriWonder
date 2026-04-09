/**
 * Socket.io — salon groupe : réactions, transcription, nouveaux messages, frappe.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getSocketBaseUrl } from '@/lib/getSocketBaseUrl';
import { createSocket } from '@/lib/socketConfig';

export function useGroupMessageSocket({ userId, userName, groupId, queryClient, enabled = true }) {
  const socketRef = useRef(null);
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const [typingUser, setTypingUser] = useState(null);
  const [recordingUser, setRecordingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || !userId || !groupId || !queryClient) return undefined;

    const base = getSocketBaseUrl();
    const socket = createSocket(base);
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('user:join', userId);
      socket.emit('message:join-group', groupId);
    };

    socket.on('connect', onConnect);

    socket.on('message:updated', (payload) => {
      if (!payload?.messageId || payload.groupId !== groupId) return;
      const qc = queryClientRef.current;
      qc.setQueryData(['group-messages', groupId], (old) => {
        if (!old) return old;
        const patchList = (list) =>
          list.map((m) => {
            if (m.id !== payload.messageId) return m;
            return {
              ...m,
              ...(payload.is_deleted !== undefined ? { is_deleted: payload.is_deleted } : {}),
              ...(payload.is_edited !== undefined ? { is_edited: payload.is_edited } : {}),
              ...(payload.content !== undefined ? { content: payload.content } : {}),
              ...(payload.media_url !== undefined ? { media_url: payload.media_url } : {}),
              ...(payload.thumbnail_url !== undefined ? { thumbnail_url: payload.thumbnail_url } : {}),
              ...(payload.transcription_text !== undefined ? { transcription_text: payload.transcription_text } : {}),
              ...(payload.reactions !== undefined
                ? { reactions: payload.reactions == null ? {} : payload.reactions }
                : {}),
              ...(payload.poll_votes !== undefined
                ? { poll_votes: payload.poll_votes == null ? {} : payload.poll_votes }
                : {}),
              ...(payload.poll_options !== undefined ? { poll_options: payload.poll_options } : {}),
              ...(payload.event_id !== undefined ? { event_id: payload.event_id } : {}),
              ...(payload.event_ref !== undefined ? { event_ref: payload.event_ref } : {}),
              ...(payload.status !== undefined ? { status: payload.status } : {}),
              ...(payload.scheduled_at !== undefined ? { scheduled_at: payload.scheduled_at } : {}),
            };
          });
        if (old.pages && Array.isArray(old.pages)) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: patchList(page.messages || []),
            })),
          };
        }
        if (old.messages && Array.isArray(old.messages)) {
          return { ...old, messages: patchList(old.messages) };
        }
        return old;
      });
    });

    socket.on('message:new', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId || !payload.message?.id) return;
      const incoming = payload.message;
      const qc = queryClientRef.current;
      qc.setQueryData(['group-messages', groupId], (old) => {
        if (!old) return old;
        if (old.pages?.length) {
          const p0 = old.pages[0];
          const list = p0.messages || [];
          if (list.some((m) => m.id === incoming.id)) return old;
          return {
            ...old,
            pages: [{ ...p0, messages: [incoming, ...list] }, ...old.pages.slice(1)],
          };
        }
        if (old.messages && Array.isArray(old.messages)) {
          if (old.messages.some((m) => m.id === incoming.id)) return old;
          return { ...old, messages: [incoming, ...old.messages] };
        }
        return old;
      });
      qc.invalidateQueries({ queryKey: ['messages-groups'] });
      qc.invalidateQueries({ queryKey: ['messages-unread-count', userId] });
    });

    socket.on('message:group-typing', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      if (payload.userId === userId) return;
      setTypingUser(payload.typing ? { userId: payload.userId, name: payload.name || 'Quelqu\'un' } : null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (payload.typing) {
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 4000);
      }
    });

    socket.on('message:group-recording', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      if (payload.userId === userId) return;
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (payload.recording) {
        setRecordingUser({ userId: payload.userId, name: payload.name || 'Quelqu\'un' });
        recordingTimeoutRef.current = setTimeout(() => setRecordingUser(null), 120_000);
      } else {
        setRecordingUser(null);
      }
    });

    socket.on('group:message-pinned', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      const qc = queryClientRef.current;
      qc.setQueryData(['group', groupId], (old) => {
        if (!old || typeof old !== 'object') return old;
        return {
          ...old,
          pinned_message_id: payload.pinned_message_id ?? null,
          pinned_message: payload.pinned_message ?? null,
        };
      });
    });

    socket.on('group:message-unpinned', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      const qc = queryClientRef.current;
      qc.setQueryData(['group', groupId], (old) => {
        if (!old || typeof old !== 'object') return old;
        return {
          ...old,
          pinned_message_id: null,
          pinned_message: null,
        };
      });
    });

    socket.on('group:updated', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      const qc = queryClientRef.current;
      qc.setQueryData(['group', groupId], (old) => {
        if (!old || typeof old !== 'object') return old;
        return {
          ...old,
          ...(payload.name != null ? { name: payload.name } : {}),
          ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.invite_token !== undefined ? { invite_token: payload.invite_token } : {}),
        };
      });
      qc.invalidateQueries({ queryKey: ['messages-groups'] });
    });

    socket.on('group:members-updated', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId) return;
      const qc = queryClientRef.current;
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['messages-groups'] });
    });

    socket.on('group:call-ended', (payload) => {
      if (!payload?.groupId || payload.groupId !== groupId || !payload.callId) return;
      toast.info('Appel groupe terminé', { duration: 5000 });
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      socket.emit('message:leave-group', groupId);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, groupId, queryClient, enabled]);

  const emitGroupTypingStart = useCallback(() => {
    if (socketRef.current?.connected && groupId && userId) {
      socketRef.current.emit('message:group-typing-start', {
        groupId,
        userId,
        name: userName || undefined,
      });
    }
  }, [groupId, userId, userName]);

  const emitGroupTypingStop = useCallback(() => {
    if (socketRef.current?.connected && groupId && userId) {
      socketRef.current.emit('message:group-typing-stop', { groupId, userId });
    }
  }, [groupId, userId]);

  const emitGroupRecordingStart = useCallback(() => {
    if (socketRef.current?.connected && groupId && userId) {
      socketRef.current.emit('message:group-recording-start', {
        groupId,
        userId,
        name: userName || undefined,
      });
    }
  }, [groupId, userId, userName]);

  const emitGroupRecordingStop = useCallback(() => {
    if (socketRef.current?.connected && groupId && userId) {
      socketRef.current.emit('message:group-recording-stop', { groupId, userId });
    }
  }, [groupId, userId]);

  return {
    typingUser,
    recordingUser,
    emitGroupTypingStart,
    emitGroupTypingStop,
    emitGroupRecordingStart,
    emitGroupRecordingStop,
  };
}
