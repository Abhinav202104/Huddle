export default function Controls({ micOn, camOn, sharing, board, onMic, onCam, onShare, onBoard, onLeave }) {
  return (
    <div className="ctl">
      <button className={micOn ? '' : 'off'} onClick={onMic}>{micOn ? 'Mute' : 'Unmute'}</button>
      <button className={camOn ? '' : 'off'} onClick={onCam}>{camOn ? 'Stop video' : 'Start video'}</button>
      <button className={sharing ? 'on' : ''} onClick={onShare}>{sharing ? 'Stop sharing' : 'Share screen'}</button>
      <button className={board ? 'on' : ''} onClick={onBoard}>{board ? 'Back to video' : 'Whiteboard'}</button>
      <button className="leave" onClick={onLeave}>Leave</button>
    </div>
  );
}
