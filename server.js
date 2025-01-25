import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('draw', (data) => {
        console.log('drawwwwww');
        socket.broadcast.emit('draw', data);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
