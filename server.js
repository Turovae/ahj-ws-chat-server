/* eslint-disable import/no-extraneous-dependencies */
const http = require('http');
const Koa = require('koa');
const WS = require('ws');

const app = new Koa();

const authors = new Set();
const messages = [];

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());

const wsServer = new WS.Server({ server });

function addAuthor(author) {
  if (authors.has(author)) {
    return false;
  }
  authors.add(author);
  return true;
}

function sendToAllClients(msg) {
  Array.from(wsServer.clients)
    .filter((client) => client.readyState === WS.OPEN)
    .forEach((client) => {
      client.send(JSON.stringify(msg));
    });
}

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const request = JSON.parse(msg);

    if (request.type === 'connection') {
      if (addAuthor(request.author)) {
        const message = {
          ok: true,
          type: request.type,
          author: request.author,
          authors: Array.from(authors),
          statusMessage: `${request.author} have been connected`,
          messages,
        };

        sendToAllClients(message);
      } else {
        ws.send(JSON.stringify({
          ok: false,
          type: request.type,
          author: undefined,
          authors: Array.from(authors),
          statusMessage: 'this name already exist',
        }));
      }
    }

    if (request.type === 'disconnect') {
      const { author } = request;
      if (authors.has(author)) {
        authors.delete(author);
        const message = {
          ok: true,
          type: request.type,
          author: request.author,
          authors: Array.from(authors),
          statusMessage: `${request.author} have been disconnected`,
          messages,
        };

        sendToAllClients(message);
      } else {
        ws.send(JSON.stringify({
          ok: false,
          type: request.type,
          author: undefined,
          authors: Array.from(authors),
          statusMessage: 'this name do\'t exist',
        }));
      }
    }

    if (request.type === 'message') {
      const rxMessage = {
        author: request.author,
        body: request.body,
        created: new Date(),
      };

      messages.push(rxMessage);

      const txMessage = {
        ok: true,
        type: request.type,
        ...rxMessage,
      };

      sendToAllClients(txMessage);
    }
  });
});

server.listen(port);
