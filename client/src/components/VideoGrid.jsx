import VideoTile from './VideoTile.jsx';

export default function VideoGrid({ hidden, me, localStream, micOn, camOn, sharing, peers }) {
  return (
    <div className={`grid${hidden ? ' off' : ''}`} data-count={peers.length + 1}>
      <VideoTile stream={localStream} name={me.name} local audio={micOn} video={camOn || sharing} sharing={sharing} />
      {peers.map((p) => (
        <VideoTile key={p.id} stream={p.stream} name={p.user.name} audio={p.audio} video={p.video || p.sharing} sharing={p.sharing} />
      ))}
    </div>
  );
}
