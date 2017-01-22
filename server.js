var express = require('express');
var app     = express();
var path    = require("path");
var bodyParser = require('body-parser')

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

//For avoidong Heroku $PORT error
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname+'/index.html'));
}).listen(app.get('port'));

app.post("/compile", function (request, response) {
    console.log(request.body.code)
});