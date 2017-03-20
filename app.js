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
var OpenTok = require('opentok'), opentok = new OpenTok("45799882", "68f33a17962141a79f1e652ede44751952174e8b")
var soloUsers = {depression: [], academicStress:[], relationships: [], other:[]} //users from each category who haven't been paired
var rooms = {} //available rooms


io.on('connection', function (socket) {
  console.log("connected yo.... socketData-", socket.id)
  socket.on('user', function(username){
  this.username = username;
    console.log("The user's name is... ", username, " SOCKET.USERNAME... ", socket.username)
  })
  
  socket.on('choseTopic', function(userTopic) {
    console.log("The chosen topic is.... ", userTopic);
    this.userTopic = userTopic;
    soloUsers[userTopic].push({username: this.username, socketId: this.id})
  });

  if(socket.userTopic){
    var partner;
    var partnerSocket;
    for (var i = 0; i < soloUsers.length; i++) {
        var newPartner = soloUsers[i];
        if(socket.id === soloPartner.id){
          continue;
        }

        // Make sure our last partner is not our new partner
        if (socket.partner != newPartner) {              
          // Get the socket client for this user
          partnerSocket = rooms[newPartner.socketId];

          // Remove the partner we found from the list of solo users
          soloUsers.splice(i, 1);

          // If the user we found exists...
          if (partnerSocket) {
            // Set as our partner and quit the loop today
            partner = newPartner;
            break;
          }
        }
      }
  }

  socket.on('room', function(room) {
        socket.join(room);
    });

  
  socket.on('idCheck', function(id){
    if(id === "11550"){
      console.log("Valid user")
    }
  })

  socket.on( 'message', function( msg ){
    
    console.log( this.username + " said " + msg);
  });

  socket.emit('greeting', "Hello from Ventbox", socket.id)

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
