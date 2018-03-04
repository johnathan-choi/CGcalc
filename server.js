// server.js
const PORT = process.env.PORT || 8080;

var express  = require('express');
var app      = express();                   
var morgan = require('morgan');             
var bodyParser = require('body-parser');    
var methodOverride = require('method-override'); 
var xlsx = require('xlsx');
var fileUpload = require('express-fileupload');
var fs = require('fs-extra');
var request = require('request');
var rp = require('request-promise');
var usdcad = require('./public/lib/usdcad.json');
var async = require('async');

app.use(express.static(__dirname + '/public'));                 
app.use(morgan('dev'));                                         
app.use(bodyParser.urlencoded({'extended':'true'}));            
app.use(bodyParser.json());                                     
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 
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
    var capGain=0, capLoss=0;
    
    var promiseSheet = new Promise(function(resolve, reject) {

    async.forEachOfSeries(jsonSheet, function(value, key, callback) {
        var tradeDate, tradeDate2, tradeMarket, tradeAlt, tradeType, 
            tradePrice, tradeAmount, tradeTotal, tradeDateFixer, usdRate, cadRate, 
            tradeFee, tradeFeeCoin, cadFinal, cadTotal; //declare variables

        tradeDate = new Date(value.Date); //start date
        tradeDate2 = new Date(tradeDate.getTime()+(60000)); //end date @ start+1 min
        tradeDateFixer = getDateTime(new Date(tradeDate), 'date-'); //start date in "-"" notation, used for fixer API
        tradeMarket = value.Market.slice(-3); //trading pair; slice to determine btc/eth/bnb
        tradeAlt = value.Market.substring(0, (value.Market.length)-3); //trading pair; the alt or the initial
        tradeType = value.Type; //buy or sell
        tradePrice = value.Price;
        tradeAmount = value.Amount;
        tradeTotal = value.Total;
        tradeFee = value.Fee;
        tradeFeeCoin = value['Fee Coin'];

        var promiseBNB;
        var promiseRate;
        var promiseRow = new Promise(function(resolve, reject) {

            if (tradeMarket=="BNB") { //i dont know
                var binHeaders = {headers:{'X-MBX-APIKEY':'7V0zsdyUVPy4fE3iJgOsRU8hAEbdoIQ5qfn5HF5jo1PwYoGP6fU8t1dulR4RnAQZ'}};
                rp.get('https://api.binance.com/api/v1/klines?symbol=BNBUSDT&interval=1m&limit=1&startTime='+tradeDate.getTime()+"&endTime="+tradeDate2.getTime(), binHeaders).then(function(body){
                    console.log(JSON.parse(body)[0][4]);
                }).catch(function(err){
                    console.log(err + " binance api error");
                });
            }

            //make user-agent header for gdax because they need one
            var gdaxHeaders = {headers:{'User-Agent':'cgcalc'}};

            //get ETH or BTC trading price from gdax at time of trade on binance
            rp.get('https://api.gdax.com/products/'+tradeMarket+'-USD/candles?granularity=60&start='+tradeDate+'&end='+tradeDate2, gdaxHeaders).then(function(body) {
                usdRate = JSON.parse(body)[0][4];

                promiseRate = new Promise(function(resolve, reject) {
                    var usdcadSearch = usdcad.find(function(array){
                        return array.date == tradeDateFixer;
                    });

                    if (usdcadSearch) {
                        cadRate = usdcadSearch.rate;
                        resolve();
                    } else {
                        rp.get('https://api.fixer.io/'+tradeDateFixer+'?base=USD&symbols=CAD').then(function(body) {
                            cadRate = JSON.parse(body).rates.CAD;
                            usdcad.push({"date": tradeDateFixer,"rate":cadRate});

                            fs.writeJson("./public/lib/usdcad.json", usdcad).then(function(body){ //update usdcad.json
                            }).catch(function(err) {
                                console.log(err+"fs writefile")
                            });

                            resolve();
                        }).catch(function(err) {
                            console.log(err+"fixer request");
                            reject();
                        });
                    }
                }).then(function() {
                    setTimeout(resolve, 700);
                }).catch(function(err) {
                    console.log(err);
                    reject();
                });

            }).catch(function(err) {
                console.log(err+"gdax request");
                reject();
            });
        });

        Promise.all([promiseRow, promiseRate, promiseBNB]).then(function() {

            if(tradeType=="BUY") {
                if(tradeFeeCoin == tradeAlt) {
                    tradeTotal = tradePrice * (tradeAmount-tradeFee);
                }
                else if (tradeFeeCoin == "BNB") {
                    tradeTotal = tradeTotal *0.995; //or something
                }
                cadFinal = -1*tradeTotal*usdRate*cadRate;
                console.log((key+1) + ") BUY: "+ cadFinal);
                jsonSheet[key].CADValue = cadFinal;
                capLoss = capLoss+cadFinal;

            } else if(tradeType=="SELL") {
                if(tradeFeeCoin == tradeMarket){
                    tradeTotal = tradeTotal - tradeFee;
                }
                else if (tradeFeeCoin == "BNB") {
                    tradeTotal = tradeTotal *0.995; //or something
                }
                cadFinal = tradeTotal*usdRate*cadRate;
                console.log((key+1)+") SELL: " + cadFinal);
                jsonSheet[key].CADValue = cadFinal;
                capGain = capGain+cadFinal;
            }

            if (key == jsonSheet.length-1) { //when all rows are done
                jsonSheet[0].CapLoss=capLoss;
                jsonSheet[0].CapGain=capGain;
                jsonSheet[0].CapNet = capLoss+capGain;
                worksheet = xlsx.utils.json_to_sheet(jsonSheet);
                workbook.Sheets[workbook.SheetNames[0]] = worksheet;
                var fileName = 'result.xlsx';
                xlsx.writeFile(workbook, "./public/temp/"+fileName);
                                
                res.status(200).send(fileName);
            }

            callback();
        }).catch(function(err) {
            console.log(err + "\nPromise rejected. Should restart.");
        }); //promiseRow
    }); //async forEachOfSeries

    });
});

app.get('/api/time', function(req, res){
    res.status(304).send(getDateTime(new Date()));
});
// listen (start app with node server.js) ======================================

app.listen(PORT).setTimeout(1200000);
console.log("App listening on port "+ PORT);


