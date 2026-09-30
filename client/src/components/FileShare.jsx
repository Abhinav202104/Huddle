import { useEffect, useRef, useState } from 'react';
import api, { SERVER_URL } from '../services/api.js';
import { formatSize } from '../utils/format.js';

export default function FileShare({ active, socket, roomId }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;
    const add = (f) => setFiles((list) => (list.some((x) => x.id === f.id) ? list : [f, ...list]));
    socket.on('file-shared', add);
    api.get(`/files/room/${roomId}`).then((r) => setFiles(r.data.files)).catch(() => {});
    return () => socket.off('file-shared', add);
  }, [socket, roomId]);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setError('Files must be 25 MB or smaller.');
    setError('');
    setBusy(true);
    const body = new FormData();
    body.append('file', file);
    try {
      await api.post(`/files/room/${roomId}`, body); // server broadcasts 'file-shared' to the room
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={`pane${active ? ' on' : ''}`}>
      <div
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
      >
        {busy ? 'Encrypting and uploading…' : (
          <>Drop a file here or <button type="button" className="link" onClick={() => input.current?.click()}>browse</button></>
        )}
        <input ref={input} type="file" hidden onChange={(e) => upload(e.target.files[0])} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="files">
        {files.length === 0 && <p className="empty">Files shared in this room appear here.</p>}
        {files.map((f) => (
          <div className="file" key={f.id}>
            <div>
              <a href={`${SERVER_URL}/api/files/download/${f.id}`} download>{f.name}</a>
              <br />
              <small>{formatSize(f.size)} from {f.uploadedBy}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
