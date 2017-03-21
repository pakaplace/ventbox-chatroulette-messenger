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
app.use(express.static(path.join(__dirname, 'public')));

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
var queue = []; //array of waiting sockets
var allUsers = {}; //contains sockets, key is socket.id

var findPartnerSocket = function(socket){
  if(socket.verified && queue){
      var match = false;
      queue.forEach(peer){
        if(peer.userTopic === socket.userTopic){
          match= true
        }
      }
    if(match === false){break}
    var peer = queue.pop();
    var room = socket.id+"&"+peer.id;
    peer.join(room)
    socket.join(room)
    socket.room = room;
    peer.room = room;
    //peer.emit("chat start", {'name': names}) see if socket.broadcast works first
    socket.broadcast.to(room).emit('message', "Welcome!")
    socket.emit("chatStart", {'name': socket.id, 'room': room})
    peer.emit("chatStart", {'name': peer.id, 'room': room})
  }
  else{
    queue.push(socket)
  }
}
io.on('connection', function (socket) {
  console.log("connected yo.... socketData-", socket.id)
  
  //sets username
  // socket.on('user', function(username){
  //   this.username = username;
  //   console.log("The user's name is... ", username, " SOCKET.USERNAME... ", socket.username)
  // })
  //stores users in solo users array by topic and deletes them from previous array
  socket.on('choseTopic', function(userTopic) {
    console.log("User chose.... ", userTopic);
    socket.userTopic = userTopic;
    allUsers[this.id] = socket; 
    console.log("Switched user topic and deleted old user store")
  });
  
  socket.on('idCheck', function(id){
    id === "11550" ? socket.verified = true : socket.verified = false;
    allUsers[this.id] = socket;
  })

  socket.emit('greeting', "Hello from Ventbox", socket.id)

  socket.on( 'message', function(msg){
    var room = rooms[socket.id];
    socket.broadcast.to(room).emit('message', data);
    console.log(this.username + " said " + msg);
  });

  socket.on('leave room', function(){
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('chat end');
        var peerID = room.split('&');
        peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
        // add both current and peer to the queue
        findPeerForLoneSocket(allUsers[peerID]);
        findPeerForLoneSocket(socket);
  });
  socket.on('disconnect', function(){
      var room = rooms[socket.id];
      socket.broadcast.to(room).emit('chat end');
      var peerID = room.split('&');
      peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
      // disconnect socket that left, find peer for lonely socket
      findPeerForLoneSocket(allUsers[peerID]);
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
