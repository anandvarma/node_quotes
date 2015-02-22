var path = require('path');
var fs = require("fs");
var url = require('url');
var express = require('express');
var io = require('socket.io');
var http = require("http");

var data = require("./dataSource.js");

/*
 * Quote Consumption Logic
 */
function sendAllQuotes() {
  var i;
  var quotes = data.getQuotes();
  for (i in quotes) {
    console.log(quotes[i].ticker + " - " + quotes[i].price);
  }

  for (i in active_sockets) {
    active_sockets[i].emit('pushQuotes', quotes);
  }
}


/*
 * HTTP Server and stuff
 */
function _connHandler(req, res) {
  res.writeHead(200);
  var path = url.parse(req.url).pathname;
  console.log("got conn for " + path);

  switch (path) {
    case '/':
      /* serve contents of index.html */
      fs.readFile("./socket.html", function(err, html) {
        if (err) {
          console.log("Failed to read index.html");
          return;
        }
        res.end(html, "utf-8");
        console.log("served index.html");
      });
      break;

    default:
      res.writeHead(404);
      res.end("opps this doesn't exist - 404");
  }

}

/* Start accepting HTTP requests */
console.log("Starting... at " + process.env.IP + ":" + process.env.PORT);
var router = express();
router.use(express.static(path.resolve(__dirname, 'public')));
var server = http.createServer(router);
server.listen(process.env.PORT, process.env.IP);

/*
 * Global Variables
 */
var active_sockets = [];



/*
 * Web Sockets and Other Dynamic Stuff
 */
var soc = io.listen(server);

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

  socket.on('requestAll', function() {
    data.updateQuotes(sendAllQuotes);
  });

  socket.on('addStock', function(tickerSym) {
    data.addStock("" + tickerSym);
    data.updateQuotes(function(){ console.log("Updated Stock List."); });
    // send out stock list and quotes
    var i;
    for (i in active_sockets) {
      active_sockets[i].emit('stockList_rsp', data.getStocks());
    }
  });
  
  socket.on('stockList', function(){
    var i;
    for (i in active_sockets) {
      active_sockets[i].emit('stockList_rsp', data.getStocks());
    }
  });
});

data.updateQuotes(function(){console.log("Initialized...")});