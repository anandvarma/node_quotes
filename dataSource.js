var http = require("http");

/*
 * API - Usage
 * setStocks    - pass an array of interested stocks
 * updateQuotes - fetch data from stock quote data source
 * getQuotes    - fetch data from memory
 */


/* Global Variables */
var quotes = [];
var stocks = ["aapl", "msft", "orcl", "ntap", "mlnx"];

/* Global variable getter and setter functions */
module.exports.getQuotes = function() {
    return quotes;
}
module.exports.getStocks = function() {
    return stocks;
}
module.exports.setStocks = function(stcks_in) {
    stocks = stcks_in;
}
module.exports.addStock = function(stock) {
    stocks.push(stock);
}



/*
 * FETCH STOCK QUOTE DATA and invoke Callback for consumption
 */
exports.updateQuotes = function updateQuotes(dataConsumerCallback) {

    /* GET Options */
    var getOptions = {
        host: 'www.google.com',
        port: 80,
        path: '/finance/info?client=ig&q=' + stocks.join(",")
    };

    /* GET Request*/
    http.get(getOptions, function(response) {
        var buff = ""

        /* Append new data */
        response.on('data', function(chunk) {
            buff += chunk;
        });


        /* Connection Closed, Process Buffer */
        response.on('end', function() {
            /* Check if SUCCESS */
            if (response.statusCode != 200) {
                console.log("BAD RESPONSE, code-" + response.statusCode);
                return;
            }

            /* work-around */
            buff = buff.substr(3);

            /* Parse JSON */
            if (buff.length > 0) {
                try {
                    var qj_arr = JSON.parse(buff);
                }
                catch (err) {
                    console.log("Json parsing failed, " + err);
                    return;
                }
            }

            /* Clean and send for consumption */
            var i;
            quotes = []
            for (i in qj_arr) {
                var qJSON = qj_arr[i];
                var quote = {};

                quote.ticker = qJSON.t;
                quote.exchange = qJSON.e;
                quote.price = qJSON.l_cur;
                quote.change = qJSON.c;
                quote.change_p = qJSON.cp;
                quote.timestamp = qJSON.lt;

                quotes.push(quote);
            }

            /* Invoke Post GET data-consumer */
            dataConsumerCallback();
        });
    });
}