// STUN finds your public address. TURN relays media when a direct connection is impossible.
const iceServers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

const { VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL } = import.meta.env;
if (VITE_TURN_URL) {
  iceServers.push({
    urls: VITE_TURN_URL.split(',').map((u) => u.trim()),
    username: VITE_TURN_USERNAME,
    credential: VITE_TURN_CREDENTIAL,
  });
}

export const RTC_CONFIG = { iceServers };
