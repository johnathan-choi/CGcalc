// server.js

var express  = require('express');
var app      = express();                               // create our app w/ express
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)

//xlsx
var xlsx = require('xlsx');

var fileUpload = require('express-fileupload');

var request = require('request');


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
    else if (mode == "time"){ // HH:MM
        return hours + ":" + minutes;
    }
    else{ // YYYY/MM/DD HH:MM
        return date.getFullYear() + "/" + month + "/" + day + " " + hours + ":" + minutes;
    }
    
}

app.post('/api/doc', function(req, res){
    var workbook = xlsx.read(req.files.file.data);
    var worksheet = workbook.Sheets[workbook.SheetNames[0]];
    var jsonSheet = xlsx.utils.sheet_to_json(worksheet).reverse();

    var i=0;
    function doThis(){
        var tradeDate, tradeDate2, tradeMarket, tradeType, tradeTotal, tradeFeeCoin, tradeFee, tradeQuery; //declare variables
        tradeDate = new Date(jsonSheet[i].Date); //start date
        tradeDate2 = new Date(tradeDate.getTime()+(60000)); //end date
        tradeMarket = jsonSheet[i].Market.slice(-3); //trading pair
        console.log(jsonSheet[i].Market);

        var gdaxHeaders = { //define header for gdax
            headers:{
                'User-Agent':'cgcalc'
            }
        };

        request.get('https://api.gdax.com/products/'+tradeMarket+'-USD/candles?granularity=60&start='+tradeDate+'&end='+tradeDate2, gdaxHeaders, function(err, res, body){
            console.log(tradeMarket +" closing price: ");
            console.log(JSON.parse(body)[0][4]);
            i++;
            if (i==jsonSheet.length){
                return;
            }
            else{
                setTimeout(function(){doThis();}, 1000);
            }
        });
    };
    doThis();
    res.json(jsonSheet);
});

// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");