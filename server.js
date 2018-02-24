// server.js

var express  = require('express');
var app      = express();                               // create our app w/ express
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var xlsx = require('xlsx');
var fileUpload = require('express-fileupload');
var fs = require('fs-extra');
var request = require('request');
var rp = require('request-promise');
var usdcad = require('./public/lib/usdcad.json');
var async = require('async');


app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.use(fileUpload());

function getDateTime(date, mode){ //turns dates legible
    var month = date.getMonth()+1;
        if (month - 10 < 0){
            month = "0" + month;
        }
    var day = date.getDate();
        if (day - 10 < 0){
            day = "0" + day;
        }
    var hours = date.getHours();
        if (hours - 10 < 0){
            hours = "0" + hours;
        }
    var minutes = date.getMinutes();
        if (minutes - 10 < 0){
            minutes = "0" + minutes;
        }
    if (mode == "date"){ // YYYY/MM/DD
        return date.getFullYear() + "/" + month + "/" + day;
    }
    else if (mode == "date-"){ // YYYY-MM-DD
        return date.getFullYear() + "-" + month + "-" + day;
    }
    else if (mode == "time"){ // HH:MM
        return hours + ":" + minutes;
    }
    else{ // YYYY/MM/DD HH:MM
        return date.getFullYear() + "/" + month + "/" + day + " " + hours + ":" + minutes;
    }

}

app.post('/api/doc', function(req, res) {
    var workbook = xlsx.read(req.files.file.data); //input file to workbook
    var worksheet = workbook.Sheets[workbook.SheetNames[0]]; //workbook sheet1
    var jsonSheet = xlsx.utils.sheet_to_json(worksheet).reverse(); //sheet1 to json. binance sheet is ordered newest -> oldest, so I'm using reverse function

    async.forEachSeries(jsonSheet, function(value, callback) {
        var tradeDate, tradeDate2, tradeMarket, tradeType, tradeTotal, tradeQuery, tradeDateFixer; //declare variables
        tradeDate = new Date(value.Date); //start date
        tradeDate2 = new Date(tradeDate.getTime()+(60000)); //end date @ start+1 min
        tradeDateFixer = getDateTime(new Date(tradeDate), 'date-');
        tradeMarket = value.Market.slice(-3); //trading pair; slice to determine btc/eth
        tradeType = value.Type; //buy or sell

        var promise = new Promise(function(resolve, reject) {

            function getGDAXrate(){
                //make user-agent header for gdax because they need one
                var gdaxHeaders = {headers:{'User-Agent':'cgcalc'}};

                //get ETH or BTC trading price from gdax at time of trade on binance
                rp.get('https://api.gdax.com/products/'+tradeMarket+'-USD/candles?granularity=60&start='+tradeDate+'&end='+tradeDate2, gdaxHeaders).then(async function(body) {
                    console.log("---");
                    console.log(tradeDate);
                    console.log(tradeMarket +" closing price: "+JSON.parse(body)[0][4]);

                    setTimeout(resolve, 500);
                }).catch(function(err) {
                    console.log(err+"gdax request");
                });
            };

            function getCADrate() {
                var usdcadSearch = usdcad.find(function(array){
                    return array.date == tradeDateFixer;
                });

                if (usdcadSearch) {
                    console.log("CAD: "+usdcadSearch.rate);
                } else {
                    rp.get('https://api.fixer.io/'+tradeDateFixer+'?base=USD&symbols=CAD').then(function(body) {
                        var fixerRate = JSON.parse(body).rates.CAD;

                        usdcad.push({"date": tradeDateFixer,"rate":fixerRate});

                        //update the usdcad.json file
                        fs.writeJson("./public/lib/usdcad.json", usdcad).then(function(body){
                            console.log("usdcad.json updated");
                        }).catch(function(err) {
                            console.log(err+"fs writefile")
                        });

                        console.log("FixerCAD: "+fixerRate);
                    }).catch(function(err) {
                        console.log(err+"fixer request");
                    });
                }
            };

            getGDAXrate();
        });

        promise.then(function() {
            callback();
        });
    });

    res.json(jsonSheet);
});

// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");


