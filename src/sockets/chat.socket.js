
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected');
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
        socket.on('chat message', (msg) => {
            io.emit('chat message', msg);
        });
    });
};
