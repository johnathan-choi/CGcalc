// server.js

var express  = require('express');
var app      = express();                               // create our app w/ express
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)

//xlsx
var xlsx = require('xlsx');

var fileUpload = require('express-fileupload');


app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.use(fileUpload());

app.post('/api/doc', function(req, res){
    var workbook = xlsx.read(req.files.file.data);
    var worksheet = workbook.Sheets[workbook.SheetNames[0]];
    var jsonSheet = xlsx.utils.sheet_to_json(worksheet).reverse();


    console.log(jsonSheet);


    res.end();
});


// listen (start app with node server.js) ======================================
app.listen(8080);
console.log("App listening on port 8080");