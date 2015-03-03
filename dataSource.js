var http = require("http");

/*
 * API - Usage
 * setStocks    - pass an array of interested stocks
 * updateQuotes - fetch data from stock quote data source
 *
 * getQuotesTable   - fetch data from memory (Key- TickerSymbol; Val- array of historic quotes)
 * getTriggersTable
 */


/* Global Variables */
var stocks = ["aapl", "msft", "orcl", "tatamotors"];

/* Quote Table Init */
var quotes_table = {};
for (var i in stocks) {
    quotes_table[stocks[i].toUpperCase()] = [];
}

/* Triggers Table Init*/
var userData_table = {};
for (var i in stocks) {
    userData_table[stocks[i].toUpperCase()] = {
        low: -Infinity,
        high: Infinity,
        eps: Infinity
    };
}


/* APIs to modify/ query Quotes Data */
module.exports.getQuotes = function() {
    return quotes_table;
}

module.exports.getStocks = function() {
    return stocks;
}
module.exports.addStock = function(stock) {
    stocks.push(stock); // add to active stocks list
    quotes_table[stock.toUpperCase()] = []; // initialize quotes_table
    userData_table[stocks[i].toUpperCase()] = { // initialize userData_table
        low: -Infinity,
        high: Infinity,
        eps: Infinity
    };
}

module.exports.getUserData = function() {
    return userData_table;
}
module.exports.setUserData = function(edit) {

    /* Save user provided edit-data */
    userData_table[edit.t.toUpperCase()] = {
        low: edit.low,
        high: edit.high,
        eps: edit.eps
    };

    /* Check for Trigger Conditions */
    triggerCheck();
}



// TODO replace getQuotes with getLatestQuotes

/* Get Historical Quotes for Graphing */
module.exports.getQuoteHistory = function(stock) {
    var hist = [];

    for (var i in quotes_table[stock.toUpperCase()]) {
        hist.push({
            price: quotes_table[stock.toUpperCase()][i].price,
            time: quotes_table[stock.toUpperCase()][i].timestamp
        });
    }
    return hist;
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
            for (i in qj_arr) {
                var qJSON = qj_arr[i];
                var quote = {};

                quote.ticker = qJSON.t;
                quote.exchange = qJSON.e;
                quote.price = qJSON.l_cur;
                quote.change = qJSON.c;
                quote.change_p = qJSON.cp;
                quote.timestamp = qJSON.lt;

                quotes_table[qJSON.t.toUpperCase()].push(quote);
            }

            /* Check for Trigger Conditions */
            triggerCheck();

            /* Invoke Post GET data-consumer */
            dataConsumerCallback();
        });
    });
}



/*
 * Check for Price triggered Events
 */
function triggerCheck() {
    /* Iterate over each key(stock) */
    for (var key in userData_table) {
        if (userData_table.hasOwnProperty(key)) {

            /* Get latest quote from array */
            var quotes = quotes_table[key];
            var latest = quotes[quotes.length - 1];

            /* Skip check if Bad data */
            if (latest == undefined) {
                continue;
            }

            if (latest.price < userData_table[key].low) {
                console.log(key + " Lower Trigger Fired!");
            }
            if (latest.price > userData_table[key].high) {
                console.log(key + " Upper Trigger Fired!");
            }
        }
    }
}