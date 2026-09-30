import { useEffect, useRef, useState } from 'react';
import api from '../services/api.js';
import { formatTime } from '../utils/format.js';

export default function Chat({ active, socket, roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottom = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;
    const add = (m) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    socket.on('chat-message', add); // listen first so nothing is missed while history loads
    api.get(`/rooms/${roomId}/messages`).then((r) => setMessages((list) => {
      const seen = new Set(list.map((m) => m.id));
      return [...r.data.messages.filter((m) => !seen.has(m.id)), ...list];
    })).catch(() => {});
    return () => socket.off('chat-message', add);
  }, [socket, roomId]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages, active]);

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    socket.emit('chat-message', { text: t });
    setText('');
  };

  return (
    <div className={`pane${active ? ' on' : ''}`}>
      <div className="msgs">
        {messages.length === 0 && <p className="empty">No messages yet. Say hello.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`m${m.senderId === user.id ? ' me' : ''}`}>
            <b>{m.senderId === user.id ? 'You' : m.senderName}</b> <small>{formatTime(m.createdAt)}</small>
            <br />
            <p>{m.text}</p>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form className="compose" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message everyone" aria-label="Message" maxLength={2000} />
        <button className="btn">Send</button>
      </form>
    </div>
  );
}
