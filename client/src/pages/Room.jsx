import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import useWebRTC from '../hooks/useWebRTC.js';
import api from '../services/api.js';
import VideoGrid from '../components/VideoGrid.jsx';
import Controls from '../components/Controls.jsx';
import Chat from '../components/Chat.jsx';
import FileShare from '../components/FileShare.jsx';
import Whiteboard from '../components/Whiteboard.jsx';
import ParticipantList from '../components/ParticipantList.jsx';

function Timer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="timer">{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</span>;
}

function Meeting({ roomId }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const rtc = useWebRTC({ socket, roomId });
  const [board, setBoard] = useState(false);
  const [tab, setTab] = useState('chat');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!rtc.notice) return undefined;
    const t = setTimeout(rtc.clearNotice, 4500);
    return () => clearTimeout(t);
  }, [rtc.notice]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  if (rtc.roomError) {
    return (
      <div className="splash col">
        <p>{rtc.roomError}</p>
        <Link className="btn" to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="room">
      <header className="rbar">
        <div>
          <b>Huddle</b>
          <span className="code">{roomId}</span>
          <Timer />
        </div>
        <button className="btn ghost light" onClick={copy}>{copied ? 'Copied' : 'Copy invite link'}</button>
      </header>
      {rtc.notice && <div className="toast" role="status">{rtc.notice}</div>}
      <div className="body">
        <div className="main">
          <VideoGrid hidden={board} me={user} localStream={rtc.localStream} micOn={rtc.micOn} camOn={rtc.camOn} sharing={rtc.sharing} peers={rtc.peers} />
          <Whiteboard active={board} socket={socket} />
        </div>
        <aside className="side">
          <div className="stabs">
            {[['chat', 'Chat'], ['files', 'Files'], ['ppl', `People (${rtc.peers.length + 1})`]].map(([id, label]) => (
              <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <Chat active={tab === 'chat'} socket={socket} roomId={roomId} user={user} />
          <FileShare active={tab === 'files'} socket={socket} roomId={roomId} />
          <ParticipantList active={tab === 'ppl'} me={user} micOn={rtc.micOn} peers={rtc.peers} />
        </aside>
      </div>
      <Controls
        micOn={rtc.micOn}
        camOn={rtc.camOn}
        sharing={rtc.sharing}
        board={board}
        onMic={rtc.toggleMic}
        onCam={rtc.toggleCam}
        onShare={rtc.toggleShare}
        onBoard={() => setBoard(!board)}
        onLeave={() => nav('/dashboard')}
      />
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  // Register as a participant first. Files and chat history are only served to participants.
  useEffect(() => {
    setStatus('loading');
    api.post(`/rooms/${roomId}/join`)
      .then(() => setStatus('ready'))
      .catch((e) => {
        setMessage(e.response?.data?.message || 'Could not join this room.');
        setStatus('error');
      });
  }, [roomId]);

  if (status === 'loading') return <div className="splash">Joining room…</div>;
  if (status === 'error') {
    return (
      <div className="splash col">
        <p>{message}</p>
        <Link className="btn" to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }
  return <Meeting roomId={roomId} />;
}
