import app from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { startWorkers } from './jobs';
import { initWatchPartySocket } from './socket/watch-party.gateway';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.set('io', io);

// Khởi động Socket.io gateway
initWatchPartySocket(io as any);

// Khởi động BullMQ workers
startWorkers();

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
