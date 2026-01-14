require("dotenv").config();

const http = require("http");
const createApp = require("./app");

const handler = createApp();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => handler(req, res));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
