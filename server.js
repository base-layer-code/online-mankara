const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {}; // ルーム情報を保持

io.on('connection', (socket) => {
    socket.on('join-room', () => {
        // 空いているルーム（1人だけいる部屋）を探す
        let roomId = Object.keys(rooms).find(id => rooms[id].length === 1);
        
        if (!roomId) {
            // 新規ルーム作成 (8桁のランダム文字列)
            roomId = Math.random().toString(36).substring(2, 10).toUpperCase();
            rooms[roomId] = [socket.id];
            socket.join(roomId);
            socket.emit('init', { roomId, myId: 0, isHost: true });
        } else {
            // 既存ルームに参加
            rooms[roomId].push(socket.id);
            socket.join(roomId);
            socket.emit('init', { roomId, myId: 1, isHost: false });
            // 2人揃ったことを全員に通知
            io.to(roomId).emit('player-joined', { count: 2 });
        }

        // 切断時の処理
        socket.on('disconnect', () => {
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                if (rooms[roomId].length === 0) delete rooms[roomId];
            }
        });
    });

    // ゲーム開始コマンドを同期
    socket.on('start-game', (roomId) => {
        io.to(roomId).emit('game-start-broadcast');
    });

    // 石の移動を同期
    socket.on('make-move', (data) => {
        socket.to(data.roomId).emit('receive-move', data.idx);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
