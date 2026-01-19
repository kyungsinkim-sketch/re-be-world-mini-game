import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');
console.log(`[SERVER] Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// 404 에러 방지를 위한 SPA 리다이렉트
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/assets/')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next();
    });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["*"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

const players = new Map();

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🟢 Player connected: ${socket.id}`);

    // 플레이어 참가
    socket.on('join', (data) => {
        const player = {
            id: socket.id,
            x: 8 * 32 + 16,
            y: 58 * 32 + 16,
            characterIndex: 0,
            nickname: data.nickname || '익명',
            scene: 'GameScene' // Default scene
        };
        players.set(socket.id, player);

        // 기존 플레이어 목록 전송
        const currentPlayers = Array.from(players.values());
        socket.emit('currentPlayers', currentPlayers);

        // 다른 플레이어들에게 새 플레이어 알림
        socket.broadcast.emit('newPlayer', player);

        console.log(`[${new Date().toLocaleTimeString()}] 👤 Player joined: ${player.nickname} (${socket.id.substring(0, 4)}...)`);
        console.log(`[${new Date().toLocaleTimeString()}] 📊 Total players: ${players.size}`);
    });

    // 플레이어 이동
    socket.on('playerMovement', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.scene = data.scene || 'GameScene';
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y,
                animation: data.animation,
                scene: player.scene
            });
        }
    });

    // 캐릭터 변경
    socket.on('characterChange', (characterIndex) => {
        const player = players.get(socket.id);
        if (player) {
            player.characterIndex = characterIndex;
            socket.broadcast.emit('playerCharacterChanged', {
                id: socket.id,
                characterIndex
            });
        }
    });

    // 채팅 메시지
    socket.on('chatMessage', (messageData) => {
        const player = players.get(socket.id);
        if (player) {
            // Support both string (legacy) and object (new) message formats
            let message, scene;
            if (typeof messageData === 'string') {
                message = messageData;
                scene = player.scene;
            } else {
                message = messageData.message;
                scene = messageData.scene || player.scene;
            }

            io.emit('chatMessage', {
                id: socket.id,
                nickname: player.nickname,
                message,
                scene
            });
            console.log(`[${new Date().toLocaleTimeString()}] 💬 [${scene}] ${player.nickname}: ${message}`);
        }
    });

    // 연결 종료
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`[${new Date().toLocaleTimeString()}] 🔴 Player disconnected: ${player.nickname} (${socket.id.substring(0, 4)}...)`);
        }
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
        console.log(`[${new Date().toLocaleTimeString()}] 📊 Total players: ${players.size}`);
    });
});

const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, () => {
    console.log(`\n🎮 Re-Be World Game Server`);
    console.log(`📡 Socket.io server running on port ${PORT}`);
    console.log(`🌐 Ready for multiplayer connections!\n`);
});
