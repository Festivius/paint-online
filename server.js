import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const server = createServer(app);
const io = new Server(server);

const db = await open({
    filename: 'canvas.db',
    driver: sqlite3.Database
});

await db.exec(`
    CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        x1 REAL,
        y1 REAL,
        x2 REAL,
        y2 REAL,
        color TEXT,
        size REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('requestCanvasState', async () => {
        try {
            const query = `SELECT * FROM actions ORDER BY created_at ASC`;
            const rows = await db.all(query);
            socket.emit('sendCanvasState', rows);
        } catch (err) {
            console.error('Error fetching actions:', err);
        }
    });

    socket.on('draw', async (data) => {
        const { type, x1, y1, x2, y2, color, size } = data;
        const query = `INSERT INTO actions (type, x1, y1, x2, y2, color, size) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        try {
            await db.run(query, [type, x1, y1, x2, y2, color, size]);
            socket.broadcast.emit('draw', data);
        } catch (err) {
            console.error('Error saving drawing action:', err);
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
