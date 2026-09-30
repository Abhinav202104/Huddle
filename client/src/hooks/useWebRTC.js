import { useCallback, useEffect, useRef, useState } from 'react';
import { RTC_CONFIG } from '../utils/webrtcConfig.js';

/**
 * Mesh WebRTC: every participant keeps one RTCPeerConnection to every other participant.
 * Socket.io only carries signaling (offer / answer / ICE). Media flows peer to peer.
 * The newer participant always sends the offer to the older ones.
 */
export default function useWebRTC({ socket, roomId }) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState('');
  const [roomError, setRoomError] = useState('');

  const pcs = useRef(new Map()); // socketId -> RTCPeerConnection
  const pending = useRef(new Map()); // ICE candidates that arrived before the remote description
  const camStream = useRef(null);
  const screenStream = useRef(null);
  const media = useRef({ audio: true, video: true, sharing: false });

  const upsert = useCallback(
    (id, patch) =>
      setPeers((p) => ({ ...p, [id]: { audio: true, video: true, sharing: false, ...p[id], id, ...patch } })),
    []
  );
  const drop = useCallback((id) => {
    pcs.current.get(id)?.close();
    pcs.current.delete(id);
    pending.current.delete(id);
    setPeers((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    let cancelled = false;

    const videoToSend = () => screenStream.current?.getVideoTracks()[0] || camStream.current?.getVideoTracks()[0];

    const createPeer = (id, user) => {
      if (pcs.current.has(id)) return pcs.current.get(id);
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const streams = camStream.current ? [camStream.current] : [];
      const audio = camStream.current?.getAudioTracks()[0];
      const video = videoToSend();
      if (audio) pc.addTrack(audio, ...streams);
      else pc.addTransceiver('audio', { direction: 'recvonly' });
      if (video) pc.addTrack(video, ...streams);
      else pc.addTransceiver('video', { direction: 'recvonly' });

      const remote = new MediaStream();
      pc.ontrack = (e) => {
        remote.addTrack(e.track);
        upsert(id, { user, stream: remote });
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { to: id, candidate: e.candidate });
      };
      pcs.current.set(id, pc);
      upsert(id, { user });
      return pc;
    };

    const flush = async (id, pc) => {
      const queue = pending.current.get(id) || [];
      pending.current.delete(id);
      for (const c of queue) {
        try { await pc.addIceCandidate(c); } catch { /* stale candidate */ }
      }
    };

    const safe = (fn) => (...args) => fn(...args).catch((e) => console.error('signaling error', e));

    const onRoomUsers = async (users) => {
      for (const { socketId, user, media: m } of users) {
        const pc = createPeer(socketId, user);
        if (m) upsert(socketId, m);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: socketId, sdp: pc.localDescription });
      }
    };
    const onOffer = async ({ from, user, media: m, sdp }) => {
      const pc = createPeer(from, user);
      if (m) upsert(from, m);
      await pc.setRemoteDescription(sdp);
      await flush(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, sdp: pc.localDescription });
    };
    const onAnswer = async ({ from, sdp }) => {
      const pc = pcs.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
      await flush(from, pc);
    };
    const onIce = async ({ from, candidate }) => {
      const pc = pcs.current.get(from);
      if (pc?.remoteDescription) {
        try { await pc.addIceCandidate(candidate); } catch { /* ignore */ }
      } else {
        pending.current.set(from, [...(pending.current.get(from) || []), candidate]);
      }
    };

    const handlers = {
      'room-users': safe(onRoomUsers),
      offer: safe(onOffer),
      answer: safe(onAnswer),
      'ice-candidate': safe(onIce),
      'user-left': ({ socketId }) => drop(socketId),
      'user-joined': ({ user }) => setNotice(`${user.name} joined`),
      'media-state': ({ from, audio, video, sharing: s }) => upsert(from, { audio, video, sharing: s }),
      'room-error': ({ message }) => setRoomError(message),
    };
    Object.entries(handlers).forEach(([evt, h]) => socket.on(evt, h));

    (async () => {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setNotice('Camera unavailable. You joined with audio only.');
        } catch {
          setNotice('No camera or microphone found. You can still watch, chat and draw.');
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      camStream.current = stream;
      setLocalStream(stream);
      media.current = {
        audio: !!stream?.getAudioTracks().length,
        video: !!stream?.getVideoTracks().length,
        sharing: false,
      };
      setMicOn(media.current.audio);
      setCamOn(media.current.video);
      socket.emit('join-room', { roomId, media: media.current });
    })();

    return () => {
      cancelled = true;
      Object.entries(handlers).forEach(([evt, h]) => socket.off(evt, h));
      socket.emit('leave-room');
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      pending.current.clear();
      camStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current?.getTracks().forEach((t) => t.stop());
      camStream.current = null;
      screenStream.current = null;
      setPeers({});
    };
  }, [socket, roomId, upsert, drop]);

  const broadcast = () => socket?.emit('media-state', media.current);

  const toggleMic = () => {
    const t = camStream.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    media.current.audio = t.enabled;
    setMicOn(t.enabled);
    broadcast();
  };

  const toggleCam = () => {
    const t = camStream.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    media.current.video = t.enabled;
    setCamOn(t.enabled);
    broadcast();
  };

  // Swap the outgoing video track on every connection. No renegotiation needed.
  const replaceVideo = async (track) => {
    for (const pc of pcs.current.values()) {
      const t = pc.getTransceivers().find((x) => x.receiver.track.kind === 'video');
      if (t) await t.sender.replaceTrack(track);
    }
  };

  const stopShare = async () => {
    if (!screenStream.current) return;
    screenStream.current.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    await replaceVideo(camStream.current?.getVideoTracks()[0] || null);
    media.current.sharing = false;
    setSharing(false);
    setLocalStream(camStream.current);
    broadcast();
  };

  const toggleShare = async () => {
    if (screenStream.current) return stopShare();
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = s.getVideoTracks()[0];
      screenStream.current = s;
      track.onended = stopShare; // browser's own "Stop sharing" button
      await replaceVideo(track);
      media.current.sharing = true;
      setSharing(true);
      setLocalStream(new MediaStream([...(camStream.current?.getAudioTracks() || []), track]));
      broadcast();
    } catch {
      /* user cancelled the picker */
    }
  };

  return {
    localStream,
    peers: Object.values(peers).filter((p) => p.user),
    micOn,
    camOn,
    sharing,
    notice,
    clearNotice: () => setNotice(''),
    roomError,
    toggleMic,
    toggleCam,
    toggleShare,
  };
}
