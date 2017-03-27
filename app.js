var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(function(req, res, next){
  res.io = io;
  next();
});
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

//open tok
// var OpenTok = require('opentok'), opentok = new OpenTok("45799882", "68f33a17962141a79f1e652ede44751952174e8b")
// var soloUsers = [{depression: []}, {academicStress:[]}, {relationships: []}, {other:[]}] //users from each category who haven't been paired
var rooms = {} //rooms by socket1.id+socket2.id
var queue = {}; //CHANGE TO OBJECT STYLE OF ALL USERS
var allUsers = {}; //contains sockets, key is socket.id
var peerId;


//ERROR LINE 81, peerID is reset wehn it goes into the else statement on line 81;
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
var findPartnerSocket = function(socket){
  console.log("FINDing PARTNER SOCKET ")
  if(socket.verified && !isEmpty(queue)){ //queue will be full every time
    console.log("inside queue~~~~   ", queue)
      var match = false;
      for(id in queue){
        var peer = queue[id]
        console.log("ID~~~~~~", id, "  Peer~~~~~", peer)
        console.log("peer.topic ", peer.topic, " socket.topic ", socket.topic)
        if(peer.topic === socket.topic){
          console.log()
          match = true
          peerId = id;
          console.log("peer id line 74ish~~~ ", peerId)
        }
      }
      // queue.forEach(function(peer){
      //   if(peer.topic === socket.topic){
      //     match = true
      //     peerId = peer.id;
      //     console.log("peer id line 74~~~"+ peerId)
      //   }
      // })
    if(match === false){
      console.log("no match found, pushing ", socket.id, " to queue");
      queue[socket.id] = socket;
      socket.emit("waitingForPartner", "Waiting for another partner. One moment please")
    }
    else{ //if there is a match, do this
      console.log("peer id line 82~~ ", peerId);
      console.log("QUEUE >>", queue)
      var peer = allUsers[peerId];
      console.log("matching two lonely sockets, the peer is... ", peer)
      delete queue[peerId]; // FIND BETTER WAY TO ORGANIZE QUEUE
      console.log("NEW QUEUE ", queue)
      var roomId = socket.id+"&"+peer.id;
      peer.join(roomId);
      socket.join(roomId);
      console.log("socket and peer joined roomId number ", roomId)
      socket.roomId = roomId;
      peer.roomId = roomId;
      console.log("Chat initiated")
      socket.broadcast.to(roomId).emit('message', "Welcome! You've chosen to discuss depression. Fun stuff!")
      socket.emit("chatStart", {'peerName': peer.name, 'roomId': roomId})
      peer.emit("chatStart", {'peerName': socket.name, 'roomId': roomId})
    }
  }
  else{
    console.log("SOCKET~~ ", socket)
    console.log("pushing socket to queue~~ ", " name ", socket.name, " id ,", socket.id, " topic ",  socket.topic)
    queue[socket.id] = socket
  }
}
io.on('connection', function (socket) {
  console.log("connected socket.... socketData-", socket.id)
  
  socket.on('join', function(data){
    console.log("heya")
    this.name = data.name;
    this.topic = data.topic;
    console.log("user topic in server join")
    data.studentId === "a" ? this.verified = true : this.verified = false;
    allUsers[this.id] = socket;
    findPartnerSocket(socket);
  })

// INDLUDED on JOIN
  // socket.on('idCheck', function(id){
  //   id === "a" ? socket.verified = true : socket.verified = false;
  //   allUsers[this.id] = socket;
  // })

  socket.emit('greeting', "Hello from Ventbox", socket.id) // only SENDS TO INDIVIDUAL NOT THE ROOM

  socket.on( 'message', function(msg){
    var room = this.roomId;
    console.log("ROOM~~~ ", room)
    socket.broadcast.to(room).emit('message', msg);
    console.log(this.name + " said " + msg);
  });

  socket.on('leaveRoom', function(){
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit("chatEnd");
        var peerID = room.split('&');
        peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
        // add both current and peer to the queue
        findPartnerSocket(allUsers[peerID]);
        findPartnerSocket(socket);
  });
  socket.on('disconnect', function(){
      var room = rooms[socket.id];
      console.log("ROOM", room);//
      socket.broadcast.to(room).emit("chatEnd");
      var peerID = room.split('&');
      peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
      // disconnect socket that left, find peer for lonely socket
      findPartnerSocket(allUsers[peerID]);
  });
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



module.exports = {app: app, server: server};
