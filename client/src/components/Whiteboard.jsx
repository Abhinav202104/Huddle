import { useEffect, useRef, useState } from 'react';

const COLORS = [
  ['#12203b', 'Ink'],
  ['#e5484d', 'Red'],
  ['#2b4bff', 'Blue'],
  ['#1f9d55', 'Green'],
];

export default function Whiteboard({ active, socket }) {
  const cv = useRef(null);
  const strokes = useRef([]); // kept so the board can be redrawn after a resize
  const drawing = useRef(false);
  const last = useRef(null);
  const [color, setColor] = useState(COLORS[0][0]);
  const [erase, setErase] = useState(false);

  const paint = (s) => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x0 * c.width, s.y0 * c.height);
    ctx.lineTo(s.x1 * c.width, s.y1 * c.height);
    ctx.stroke();
  };
  const redraw = () => {
    const c = cv.current;
    if (!c) return;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    strokes.current.forEach(paint);
  };
  const resize = () => {
    const c = cv.current;
    const r = c?.getBoundingClientRect();
    if (!r || !r.width) return; // hidden
    c.width = r.width;
    c.height = r.height;
    redraw();
  };

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active]);

  useEffect(() => {
    if (!socket) return undefined;
    const onDraw = (s) => { strokes.current.push(s); paint(s); };
    const onClear = () => { strokes.current = []; redraw(); };
    const onState = (list) => { strokes.current = list; redraw(); };
    socket.on('draw', onDraw);
    socket.on('clear-board', onClear);
    socket.on('board-state', onState);
    return () => {
      socket.off('draw', onDraw);
      socket.off('clear-board', onClear);
      socket.off('board-state', onState);
    };
  }, [socket]);

  const point = (e) => {
    const r = cv.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const down = (e) => { drawing.current = true; last.current = point(e); cv.current.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (!drawing.current) return;
    const p = point(e);
    const s = { x0: last.current.x, y0: last.current.y, x1: p.x, y1: p.y, color: erase ? '#ffffff' : color, width: erase ? 20 : 3 };
    strokes.current.push(s);
    paint(s);
    socket?.emit('draw', s);
    last.current = p;
  };
  const up = () => { drawing.current = false; };
  const clear = () => { strokes.current = []; redraw(); socket?.emit('clear-board'); };

  return (
    <div className={`wb${active ? ' on' : ''}`}>
      <div className="wbtools">
        {COLORS.map(([c, label]) => (
          <button
            key={c}
            className={`sw${!erase && color === c ? ' on' : ''}`}
            style={{ background: c }}
            aria-label={label}
            onClick={() => { setColor(c); setErase(false); }}
          />
        ))}
        <button className={`btn ghost${erase ? ' active' : ''}`} onClick={() => setErase(!erase)}>Eraser</button>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={clear}>Clear board</button>
      </div>
      <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
    </div>
  );
}
