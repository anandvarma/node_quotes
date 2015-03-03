var path = require('path');
var fs = require("fs");
var url = require('url');
var express = require('express');
var io = require('socket.io');
var http = require("http");

var data = require("./dataSource.js");

/*
 * Global Variables
 */
var active_sockets = [];

/*
 * Quote Consumption Logic
 */
function sendAllQuotes() {
  var quoteTable = data.getQuotes();
  var latestAll = [];

  for (var stock in quoteTable) {
    if (quoteTable.hasOwnProperty(stock)) {
      var quotes = quoteTable[stock];
      var latest = quotes[quotes.length - 1];
      if (latest != undefined) {
        console.log(stock + " (" + quotes.length + " entries) top-> " + latest.price);
        latestAll.push(latest);
      }
    }
  }

  /* Send out new Data to all active clients */
  for (var i in active_sockets) {
    active_sockets[i].emit('pushLatestQuotes', latestAll);
  }
}


/*
 * Start accepting HTTP requests
 */
console.log("Starting... at " + process.env.IP + ":" + process.env.PORT);
var router = express();
router.use(express.static(path.resolve(__dirname, 'public')));
var server = http.createServer(router);
server.listen(process.env.PORT, process.env.IP);

/*
 * Web Socket Handling
 */
var soc = io.listen(server);
soc.set('log level', 1);

soc.on('connection', function(socket) {
  /* Keep track of new Socket Connection */
  active_sockets.push(socket);
  console.log("Socket Connection made. Active Sockets=" + active_sockets.length);

  /* Send in Memory data */
  sendAllQuotes(); //TODO - send only to new client

  socket.on('disconnect', function() {
    active_sockets.splice(active_sockets.indexOf(socket), 1);
    console.log("Socket Connection closed. Active Sockets=" + active_sockets.length);
  });

  /* Socket Request Router */
  socket.on('clientRequest', function(req) {
    console.log(req);

    switch (req.op) {
      case 'doForceReload':
        data.updateQuotes(sendAllQuotes);
        break;

      case 'getUserData':
        var stock = req.payload.t;
        var usrData = data.getUserData()[stock.toUpperCase()];
        socket.emit('responseUserData', usrData);
        break;

      case 'setUserData':
        data.setUserData(req.payload);

        // Emit new data for UI refresh
        var stock = req.payload.t;
        var usrData = data.getUserData()[stock.toUpperCase()];
        socket.emit('responseUserData', usrData);
        break;

      case 'getPlotData':
        console.log("requested for hist data");
        socket.emit('responsePlotData', data.getQuoteHistory(req.payload));
        break;

      default:
        console.log("BAD OP-code");
    }
  });
});


/* Get data as soon as server starts */
data.updateQuotes(function() {
  console.log("Got Initial Data...");
});


/* Fetch new data periodically */
var num_per_poll = 0;

setInterval(function() {
  // Poll every minute if we have clients. Else poll every 5-mins for archive
  if ((active_sockets.length > 0) || (num_per_poll % 5 == 0)) {
    data.updateQuotes(sendAllQuotes);
  }
  num_per_poll += 1;
}, 1 * 60 * 1000);