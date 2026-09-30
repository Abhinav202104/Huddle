import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { colorFor, initials } from '../utils/format.js';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/rooms').then((r) => setRooms(r.data.rooms)).catch(() => {});
  }, []);

  const create = async () => {
    setErr('');
    try {
      const { data } = await api.post('/rooms');
      nav(`/room/${data.roomId}`);
    } catch {
      setErr('Could not create a meeting. Try again.');
    }
  };

  const join = (e) => {
    e.preventDefault();
    const c = code.trim().toLowerCase().split('/').pop(); // accepts a pasted invite link too
    if (!/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(c)) return setErr('Room codes look like abc-defg-hij.');
    nav(`/room/${c}`);
  };

  return (
    <>
      <header className="top">
        <div className="logo">Huddle</div>
        <div className="who">
          <span>{user.name}</span>
          <div className="av" style={{ background: colorFor(user.name), color: '#0e1a33' }}>{initials(user.name)}</div>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="wrap">
        <h2>Ready when you are.</h2>
        <div className="actions">
          <div className="act">
            <h3>Start a meeting</h3>
            <p>Get a room code you can share instantly.</p>
            <button className="btn" onClick={create}>New meeting</button>
          </div>
          <form className="act" onSubmit={join}>
            <h3>Join with a code</h3>
            <p>Enter the code or invite link your host sent you.</p>
            <div className="join">
              <input className="f" value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc-defg-hij" aria-label="Room code" />
              <button className="btn">Join</button>
            </div>
          </form>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <h3 style={{ marginBottom: 12 }}>Your rooms</h3>
        <div className="list">
          {rooms.length === 0 && <div className="row"><small>Rooms you create or join will show up here.</small></div>}
          {rooms.map((r) => (
            <div className="row" key={r.roomId}>
              <div>
                <div className="code">{r.roomId}</div>
                <small>{new Date(r.createdAt).toLocaleDateString()} · {r.participants} {r.participants === 1 ? 'person' : 'people'}{r.isHost ? ' · you host' : ''}</small>
              </div>
              <Link className="btn ghost" to={`/room/${r.roomId}`}>Rejoin</Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
