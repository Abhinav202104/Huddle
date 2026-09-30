import { useEffect, useRef } from 'react';
import { colorFor, initials } from '../utils/format.js';

export default function VideoTile({ stream, name, local = false, audio = true, video = true, sharing = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);

  const showVideo = !!stream && video;
  return (
    <div className="tile">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local} // never play your own microphone back
        className={showVideo ? '' : 'hidden'}
        style={local && !sharing ? { transform: 'scaleX(-1)' } : undefined}
      />
      {!showVideo && (
        <div className="big" style={{ background: colorFor(name) }}>{initials(name)}</div>
      )}
      <span className="nm">
        {name}
        {local ? ' (you)' : ''}
        {sharing ? ' is presenting' : ''}
      </span>
      {!audio && <span className="mu">Muted</span>}
    </div>
  );
}
