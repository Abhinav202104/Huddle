# Huddle: Real-Time Communication Platform (MERN + WebRTC)

Multi-user video meetings with screen sharing, chat, encrypted file sharing and a shared whiteboard.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, plain CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose |
| Real-time | Socket.io (signaling, chat, whiteboard, file notifications) |
| Video / audio | WebRTC, mesh topology, native `RTCPeerConnection` |
| NAT traversal | Google STUN, optional TURN (coturn) |
| Auth | JWT access + refresh tokens in HttpOnly cookies, bcrypt (cost 12) |
| File encryption | AES-256-GCM at rest |
| Hardening | helmet, CORS allow-list, rate limiting, input type checks, room membership checks |

## Quick start

Requirements: Node 18+, MongoDB running locally (or a MongoDB Atlas URI).

```bash
npm run install:all                # installs root, server and client
cp server/.env.example server/.env # then fill in the secrets (see below)
npm run dev                        # server on :5000, client on :5173
```

Open http://localhost:5173, create two accounts (use a second browser or an incognito window), start a meeting in one and join with the code in the other.

Generate the secrets:

```bash
# run three times: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# FILE_ENCRYPTION_KEY (must be exactly 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Camera and microphone only work on `localhost` or HTTPS. To test from a phone or another computer, deploy or use an HTTPS tunnel such as ngrok.

## Folder structure

```
realtime-platform/
├── package.json              scripts: install:all, dev, build, start
├── client/
│   ├── vite.config.js        dev proxy for /api and /socket.io
│   └── src/
│       ├── App.jsx, main.jsx, index.css
│       ├── pages/            Login, Dashboard, Room
│       ├── components/       VideoGrid, VideoTile, Controls, Chat, FileShare,
│       │                     Whiteboard, ParticipantList
│       ├── hooks/useWebRTC.js   peer connections, mute, camera, screen share
│       ├── context/          AuthContext, SocketContext
│       ├── services/api.js   Axios + automatic token refresh
│       └── utils/            webrtcConfig.js (STUN/TURN), format.js
└── server/
    ├── server.js             Express app, security middleware, serves client build
    ├── config/db.js
    ├── models/               User, Room, Message, File
    ├── controllers/          auth, room, file
    ├── routes/               auth, room, file
    ├── middleware/           authMiddleware, roomMember, rateLimiter, errorHandler
    ├── sockets/              index (auth), signaling, chat, whiteboard
    └── utils/                generateToken, encrypt (AES-256-GCM), roomCode
```

## REST API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/login` | Create account, sign in (sets cookies) |
| POST | `/api/auth/refresh`, `/logout` | Rotate tokens, clear cookies |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/rooms` | List my rooms / create a room |
| POST | `/api/rooms/:roomId/join` | Become a participant |
| GET | `/api/rooms/:roomId/messages` | Chat history (participants only) |
| POST | `/api/files/room/:roomId` | Upload (encrypted on the server) |
| GET | `/api/files/room/:roomId` | List files in a room |
| GET | `/api/files/download/:id` | Decrypt and download (participants only) |

## Socket events

| Direction | Events |
|---|---|
| Client to server | `join-room`, `leave-room`, `offer`, `answer`, `ice-candidate`, `media-state`, `chat-message`, `draw`, `clear-board` |
| Server to client | `room-users`, `user-joined`, `user-left`, `offer`, `answer`, `ice-candidate`, `media-state`, `chat-message`, `file-shared`, `draw`, `clear-board`, `board-state`, `room-error` |

## How each feature works

- **Multi-user video:** mesh WebRTC. Each participant connects directly to every other one. The newer participant always sends the offer to the older ones, so two people joining at once cannot collide. Socket.io only relays SDP and ICE. Limit is 6 people (`MAX_PARTICIPANTS`).
- **Screen sharing:** `getDisplayMedia()`, then `RTCRtpSender.replaceTrack()` on every connection. No renegotiation. Stopping from the browser's own bar is handled.
- **File sharing:** Multer keeps the upload in memory, the server encrypts it with AES-256-GCM, writes only ciphertext to `server/uploads/` under a random name, and notifies the room over Socket.io. Downloads decrypt on the fly and are served as `attachment`.
- **Whiteboard:** strokes are sent as normalized 0-1 coordinates, so different screen sizes draw the same picture. The server keeps the board in memory so late joiners see it.
- **Authentication:** bcrypt hashes, 15-minute access token and 7-day refresh token in HttpOnly cookies, refresh cookie scoped to `/api/auth`. Sockets authenticate with the same cookie in the handshake.
- **Encryption:** TLS (HTTPS/WSS) in production, DTLS-SRTP for all WebRTC media (built into the protocol), AES-256-GCM for stored files.

## Deploy

**Option A (recommended): one service.** Build the client and let Express serve it, so cookies stay same-origin.

```bash
npm run build
NODE_ENV=production npm start
```

Set `NODE_ENV=production`, `CLIENT_URL` (your public URL), `MONGO_URI` (Atlas) and the three secrets on Render, Railway or a VPS. Uploaded files live on the server disk, so use a persistent disk or move `uploads/` to S3.

**Option B: split (Vercel + Render).** Set `VITE_SERVER_URL` on the client, `CLIENT_URL` on the server, and `COOKIE_SAMESITE=none`. Some browsers block third-party cookies, so Option A is safer.

**TURN server.** About 10-20% of users cannot connect peer to peer behind strict NATs. Run coturn on a VPS and set `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` on the client. Minimal `turnserver.conf`:

```
listening-port=3478
realm=yourdomain.com
fingerprint
lt-cred-mech
user=huddle:CHANGE_ME
```

## Known limits (good to mention in a viva)

- Mesh needs upload bandwidth for every peer, so it suits about 6 people. Larger meetings need an SFU such as mediasoup or LiveKit.
- Refresh tokens are not stored server-side, so a stolen one stays valid until it expires. A production version would store and rotate them.
- Whiteboard state is in memory and resets when the server restarts.
- A user with no camera cannot start a screen share (the connection has no video sender to swap).
- The TURN credential in the client bundle is visible to users. Production setups issue short-lived credentials from the server.

## Interview talking points

- WebRTC media goes peer to peer, so the server only handles signaling and the video load never touches it.
- The server decides who may join, who receives which signal and which room an event belongs to. The client never chooses the room for chat or drawing.
- Files are encrypted before they reach the disk, with a fresh IV each time. GCM also detects tampering.
- Passwords are hashed with bcrypt, tokens are HttpOnly so JavaScript cannot steal them, and login attempts are rate limited.
