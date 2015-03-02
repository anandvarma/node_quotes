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

  for (var key in quoteTable) {
    if (quoteTable.hasOwnProperty(key)) {
      var quotes = quoteTable[key];
      var latest = quotes[quotes.length - 1];
      if (latest != undefined) {
        console.log(key + " (" + quotes.length + " entries) top-> " + latest.price);
        latestAll.push(latest);
      }
      else {
        console.log(key + " -> No Data");
      }
    }
  }

  for (var i in active_sockets) {
    active_sockets[i].emit('pushQuotes', latestAll);
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
  sendAllQuotes();

  socket.on('disconnect', function() {
    active_sockets.splice(active_sockets.indexOf(socket), 1);
    console.log("Socket Connection closed. Active Sockets=" + active_sockets.length);
  });

  /* Socket Request Router */
  socket.on('clnt_req', function(req) {

    console.log(req);

    switch (req.op) {
      case 'requestAll':
        data.updateQuotes(sendAllQuotes);
        break;

      case 'requestTrigger':
        var trig = data.getTriggers()[req.payload.t.toUpperCase()];
        socket.emit('responseTrigger', {
          lo: trig.lo,
          hi: trig.hi
        });
        break;

      case 'edit':
        data.setTriggers(req.payload);
        break;
        
      case 'hist':
        console.log("requested for hist data");
        socket.emit('hist_data', data.getQuoteHistory(req.payload));
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