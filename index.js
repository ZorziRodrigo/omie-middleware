const http = require('http');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

const app = createApp();
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
