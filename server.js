// server.js

var express  = require('express');
var app      = express();                               // create our app w/ express
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var xlsx = require('xlsx');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var request = require('request');
var usdcad = require('./public/lib/usdcad.json');


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

app.post('/api/doc', function(req, res){
    var workbook = xlsx.read(req.files.file.data); //input file to workbook
    var worksheet = workbook.Sheets[workbook.SheetNames[0]]; //workbook sheet1
    var jsonSheet = xlsx.utils.sheet_to_json(worksheet).reverse(); //sheet1 to json. binance sheet is ordered newest -> oldest, so I'm using reverse function

    var i=0;
    function getCADValue(){
        var tradeDate, tradeDate2, tradeMarket, tradeType, tradeTotal, tradeFeeCoin, tradeFee, tradeQuery, tradeDateFixer; //declare variables
        tradeDate = new Date(jsonSheet[i].Date); //start date
        tradeDate2 = new Date(tradeDate.getTime()+(60000)); //end date @ start+1 min
        tradeDateFixer = getDateTime(new Date(tradeDate), 'date-');
        tradeMarket = jsonSheet[i].Market.slice(-3); //trading pair; slice to determine btc/eth
        tradeType = jsonSheet[i].Type; //buy or sell

        //make user-agent header for gdax because they need one
        var gdaxHeaders = {headers:{'User-Agent':'cgcalc'}};

        //get ETH or BTC trading price from gdax at time of trade on binance
        request.get('https://api.gdax.com/products/'+tradeMarket+'-USD/candles?granularity=60&start='+tradeDate+'&end='+tradeDate2, gdaxHeaders, function(err, res, body){
            console.log(tradeMarket +" closing price: "+JSON.parse(body)[0][4]);

            //try to call usdcad.json for existing date+rate, if not, search and add fixer.io's data
            var usdcadSearch = usdcad.find(function(array){
                return array.date == tradeDateFixer;
            });

            if(usdcadSearch){
                console.log("CAD: "+usdcadSearch.rate);
                
                //recursive function. allows request to gdax to complete before requesting next trade
                i++;
                console.log("---");
                if (i==jsonSheet.length){
                    console.log("Done");
                    return;
                }
                setTimeout(function(){getCADValue();}, 500); //gdax max 3 req/sec; set timer of 0.5ms
            }
            else{
                request.get('https://api.fixer.io/'+tradeDateFixer+'?base=USD&symbols=CAD', function(err, res, body){
                    var fixerRate = JSON.parse(body).rates.CAD;

                    usdcad.push({"date": tradeDateFixer,"rate":fixerRate});

                    //update the usdcad.json file
                    fs.writeFile("./public/lib/usdcad.json", JSON.stringify(usdcad), (err) => {if (err) return err; console.log("usdcad.json updated");});

                    console.log("FixerCAD: "+fixerRate);

    
                    //recursive function. allows request to gdax to complete before requesting next trade
                    i++;
                    console.log("---");
                    if (i==jsonSheet.length){
                        console.log("Done");
                        return;
                    }
                    setTimeout(function(){getCADValue();}, 500); //gdax max 3 req/sec; set timer of 0.5ms
                });
            }            
        });
    };
    getCADValue();
    res.json(jsonSheet);
});

// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");