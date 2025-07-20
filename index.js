const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    credentials: true,
  },
});

app.use('/', express.static(__dirname + '/public'));
app.use('/xterm', express.static(__dirname + '/node_modules/xterm'));

function parseCpuUsage(stdout) {
  const regex = /(\d+\.\d+) id/;
  const match = stdout.match(regex);
  const idlePercentage = parseFloat(match[1]);
  const cpuUsage = 100 - idlePercentage;
  return cpuUsage.toFixed(2);
}

function parseMemoryUsage(stdout) {
  const lines = stdout.split('\n');
  const memoryLine = lines[1].split(/\s+/);
  const totalMemory = memoryLine[1];
  const usedMemory = memoryLine[2];
  const freeMemory = memoryLine[3];
  return {
    totalMemory,
    usedMemory,
    freeMemory
  };
}

function parseDiskUsage(stdout) {
  const lines = stdout.split('\n');
  const diskData = lines[3].split(/\s+/);
  const total = diskData[1];
  const used = diskData[2];
  const available = diskData[3];

  return {
    total: total,
    used: used,
    free: available
  };
}

function parseSwapUsage(stdout) {
  const lines = stdout.split('\n');
  const swapLine = lines[1].split(/\s+/);
  const totalSwap = swapLine[2];
  const usedSwap = swapLine[3];
  const freeSwap = swapLine[4];
  return {
    total: totalSwap,
    used: usedSwap,
    free: freeSwap
  };
}

function getSystemStatsSSH(host, port, username, password, callback) {
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection established');
    
    // CPU 사용량 가져오기
    conn.exec('top -bn1 | grep "Cpu(s)"', (err, stream) => {
      if (err) {
        console.error('Error fetching CPU usage:', err);
        conn.end();
        return callback(err, null);
      }

      stream.on('data', (data) => {
        const cpuUsage = parseCpuUsage(data.toString());

        // Memory 사용량 가져오기
        conn.exec('free -m', (err, stream) => {
          if (err) {
            console.error('Error fetching memory usage:', err);
            conn.end();
            return callback(err, null);
          }

          stream.on('data', (data) => {
            const memoryUsage = parseMemoryUsage(data.toString());

            // Disk 사용량 가져오기
            conn.exec('df -h', (err, stream) => {
              if (err) {
                console.error('Error fetching disk usage:', err);
                conn.end();
                return callback(err, null);
              }

              stream.on('data', (data) => {
                const diskUsage = parseDiskUsage(data.toString());

                // Swap 사용량 가져오기
                conn.exec('swapon -s', (err, stream) => {
                  if (err) {
                    console.error('Error fetching swap usage:', err);
                    conn.end();
                    return callback(err, null);
                  }

                  stream.on('data', (data) => {
                    const swapUsage = parseSwapUsage(data.toString());

                    callback(null, {
                      cpuUsage,
                      ...memoryUsage,
                      diskUsage,
                      swapUsage
                    });
                    conn.end();
                  });
                });
              });
            });
          });
        });
      });
    });
  }).on('error', (err) => {
    console.error('SSH connection error:', err);
    callback(err, null);
  }).connect({
    host,
    port,
    username,
    password
  });
}

io.on('connection', (socket) => {
  let conn = null;
  let stream = null;
  let statsInterval = null;

  socket.on('connectSSH', ({ host, port, username, password }) => {
    if (conn) {
      conn.end();
      conn = null;
    }
    
    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }

    socket.emit('status', 'Fetching system stats every 5 seconds...');

    statsInterval = setInterval(() => {
      getSystemStatsSSH(host, port, username, password, (err, stats) => {
        if (err) {
          socket.emit('status', 'Error fetching system stats');
        } else {
          socket.emit('systemStats', stats);
        }
      });
    }, 1000 * 3); // 3초마다 상태 가져오기


    // 터미널 연결
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
    
    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
  });

  socket.on('error', (err) => {
    console.error('Socket Error:', err);
  });
});

server.listen(1234);
