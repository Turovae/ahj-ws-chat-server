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

wsServer.on('connection', (ws) => {
  // console.log(ws);
  console.log('connection');
  ws.on('message', (msg) => {
    const request = JSON.parse(msg);

    if (request.type === 'connection') {
      if (addAuthor(request.author)) {
        Array.from(wsServer.clients)
          .filter((client) => client.readyState === WS.OPEN)
          .forEach((client) => {
            // console.log(client);
            client.send(JSON.stringify({
              ok: true,
              type: request.type,
              author: request.author,
              authors: Array.from(authors),
              statusMessage: `${request.author} have been connected`,
              messages,
            }));
          });
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
        Array.from(wsServer.clients)
          .filter((client) => client.readyState === WS.OPEN)
          .forEach((client) => {
            // console.log(client);
            client.send(JSON.stringify({
              ok: true,
              type: request.type,
              author: request.author,
              authors: Array.from(authors),
              statusMessage: `${request.author} have been disconnected`,
              messages,
            }));
          });
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
    console.log(authors);
  });
});

server.listen(port);
