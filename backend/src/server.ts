import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { initSockets } from './sockets';

const app = createApp();
const server = http.createServer(app);

initSockets(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`);
});
