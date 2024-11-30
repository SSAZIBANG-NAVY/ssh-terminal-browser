const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use('/', express.static(__dirname + '/public'));
app.use('/xterm', express.static(__dirname + '/node_modules/xterm'));

io.on('connection', (socket) => {
  let conn = null;
  let stream = null;

  socket.on('connectSSH', ({ host, port, username, password }) => {
    if (conn) {
      conn.end();
      conn = null;
    }
    
    conn = new Client();

    conn.on('ready', () => {
      socket.emit('status', 'SSH connection established');
      conn.shell((err, newStream) => {
        if (err) {
          socket.emit('status', 'Failed to open shell');
          console.error('SSH Shell Error:', err);
          return;
        }
        
        if (stream) {
          stream.end();
        }
        stream = newStream;

        socket.on('data', (data) => {
          if (stream) {
            stream.write(data);
          }
        });

        stream.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        stream.on('close', () => {
          socket.emit('status', 'SSH session closed');
        });

        stream.on('error', (err) => {
          socket.emit('status', 'SSH stream error');
          console.error('SSH Stream Error:', err);
        });
      });
    }).on('error', (err) => {
      socket.emit('status', 'SSH connection error');
      console.error('SSH Connection Error:', err);
    }).connect({
      host,
      port,
      username,
      password
    });
  });

  socket.on('disconnect', () => {
    if (conn) {
      conn.end();
      conn = null;
    }
    
    if (stream) {
      stream.end();
      stream = null;
    }
  });

  socket.on('error', (err) => {
    console.error('Socket Error:', err);
  });
});

server.listen(1234);
