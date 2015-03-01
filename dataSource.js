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
var stocks = ["aapl", "msft", "orcl", "ntap", "tatamotors"];

/* Quote Table Init */
var quote_table = {};
for (var i in stocks) {
    quote_table[stocks[i].toUpperCase()] = [];
}

/* Triggers Table Init*/
var trigger_table = {};
for (var i in stocks) {
    trigger_table[stocks[i].toUpperCase()] = {
        lo: -Infinity,
        hi: Infinity
    };
}


/* Global variable getter and setter functions */
module.exports.getQuotes = function() {
    return quote_table;
}
module.exports.getTriggers = function() {
    return trigger_table;
}
module.exports.getStocks = function() {
    return stocks;
}
module.exports.setStocks = function(stcks_in) {
    stocks = stcks_in;
}
module.exports.addStock = function(stock) {
    stocks.push(stock);
    quote_table[stock.toUpperCase()] = [];
}
module.exports.setTriggers = function(edit) {
    trigger_table[edit.t] = {
        lo: edit.low,
        hi: edit.high
    };
    
    /* Check for Trigger Conditions */
    triggerCheck();
}

module.exports.getQuoteHistory = function(stock) {
    var hist = [];
    
    for (var i in quote_table[stock.toUpperCase()]){
        hist.push({
            price: quote_table[stock.toUpperCase()][i].price,
            time: quote_table[stock.toUpperCase()][i].timestamp
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

                quote_table[qJSON.t.toUpperCase()].push(quote);
            }

            /* Check for Trigger Conditions */
            triggerCheck();

            /* Invoke Post GET data-consumer */
            dataConsumerCallback();
        });
    });
}

function triggerCheck() {
    for (var key in trigger_table) {
        if (trigger_table.hasOwnProperty(key)) {
            
            /* Get latest quote from array */
            var latest = quote_table[key][quote_table[key].length - 1];
            
            /* Skip for Bad data */
            if (latest == undefined) {
                continue;
            }
            
            if (latest.price < trigger_table[key].lo) {
                console.log(key + " Lower Trigger Fired!");
            }
            
            if (latest.price > trigger_table[key].hi) {
                console.log(key + " Upper Trigger Fired!");
            }
        }
    }
}