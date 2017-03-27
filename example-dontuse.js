var connected = false;
var username = 'Faizan';
var room = '';
var socket = io('http://localhost');
socket.on('connect', function (data) { // we are connected, should send our name
    connected = true;
    if (username) socket.emit('login', {'username' : username});
});
socket.on('chat start', function(data) {
    room = data.room;
    show_chat_window(data.name); // some method which will show chat window
});
socket.on('chat end', function(data) {
    hide_chat_window(); // this will close chat window and alert user that the peer ended chat
    socket.leave(room); // it's possible to leave from both server and client, hoever it is better to be done by the client in this case
    room = '';
});
socket.on('disconnect', function(data) { // handle server/connection falling
    console.log('Connection fell or your browser is closing.');
});
var send_message = function(text) { // method, which you will call when user hits enter in input field
    if (connected) socket.emit('message', {'text': text});
};
var leave_chat = function() { // call this when user want to end current chat
    if (connected) {
        socket.emit('leave room');
        socket.leave(room);
        room = '';
    }
};


//Server
var queue = [];    // list of sockets waiting for peers
var rooms = {};    // map socket.id => room
var names = {};    // map socket.id => name
var allUsers = {}; // map socket.id => socket

var findPeerForLoneSocket = function(socket) {
    // this is place for possibly some extensive logic
    // which can involve preventing two people pairing multiple times
    if (queue) {
        // somebody is in queue, pair them!
        var peer = queue.pop();
        var room = socket.id + '#' + peer.id;
        // join them both
        peer.join(room);
        socket.join(room);
        // register rooms to their names
        rooms[peer.id] = room;
        rooms[socket.id] = room;
        // exchange names between the two of them and start the chat
        peer.emit('chat start', {'name': names[socket.id], 'room':room});
        socket.emit('chat start', {'name': names[peer.id], 'room':room});
    } else {
        // queue is empty, add our lone socket
        queue.push(socket);
    }
}

io.on('connection', function (socket) {
    console.log('User '+socket.id + ' connected');
    socket.on('login', function (data) {
        names[socket.id] = data.username;
        allUsers[socket.id] = socket;
        // now check if sb is in queue
        findPeerForLoneSocket(socket);
    });
    socket.on('message', function (data) {
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('message', data);
    });
    socket.on('leave room', function () {
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('chat end');
        var peerID = room.split('#');
        peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
        // add both current and peer to the queue
        findPeerForLoneSocket(allUsers[peerID]);
        findPeerForLoneSocket(socket);
    });
    socket.on('disconnect', function () {
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('chat end');
        var peerID = room.split('#');
        peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
        // current socket left, add the other one to the queue
        findPeerForLoneSocket(allUsers[peerID]);
    });
});