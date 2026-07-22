'use strict';

const http = require('node:http');
const { createRelayHandler } = require('./app');

const port = Number(process.env.PORT) || 8000;
const server = http.createServer(createRelayHandler());

server.listen(port, '0.0.0.0', () => {
  console.log(`gongzi-wecom-relay listening on ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
