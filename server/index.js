const express = require('express');
const http = require('http');
const cors = require('cors');
const PORT = process.env.PORT || 5000;

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const router = require('./router');

const app = express();
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, Welcome to room ${user.room}` });
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!` });

    io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)})

    callback(); // Always call callback on success
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: user.name, text: message });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    }

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if(user){
      io.to(user.room).emit('message', {user: 'admin', text: `${user.name} has left`})
    }
  });
});

app.use(router);
app.use(cors());

server.listen(PORT, () => console.log(`server has Started on port ${PORT}`));
