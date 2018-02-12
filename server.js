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
var requestHeaders = {
    headers:{
        'X-MBX-APIKEY':'7V0zsdyUVPy4fE3iJgOsRU8hAEbdoIQ5qfn5HF5jo1PwYoGP6fU8t1dulR4RnAQZ'
    }
};


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

    for (var i=0; i<jsonSheet.length; i++){
        console.log((new Date(jsonSheet[i].Date)).getTime());
    }

    request.get('https://api.binance.com/api/v1/historicalTrades?symbol=XRPETH&limit=1', requestHeaders, function(err, res, body){
        body = JSON.parse(body)[0];
    });


    res.json(jsonSheet);
});

app.get('https://api.binance.com/api/v1/time', function(req, res){
    res.end();
});

// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");