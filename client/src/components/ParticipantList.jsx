import { colorFor, initials } from '../utils/format.js';

export default function ParticipantList({ active, me, micOn, peers }) {
  const rows = [{ id: 'me', name: me.name, self: true, audio: micOn }, ...peers.map((p) => ({ id: p.id, name: p.user.name, audio: p.audio }))];
  return (
    <div className={`pane${active ? ' on' : ''}`}>
      <div className="ppl">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="av" style={{ background: colorFor(r.name), color: '#0e1a33' }}>{initials(r.name)}</div>
            <span>{r.name}{r.self ? ' (you)' : ''}</span>
            {!r.audio && <small className="muted-tag">Muted</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
