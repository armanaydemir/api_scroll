var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

// nytimes articles for testing -----
// https://www.nytimes.com/2017/02/01/magazine/the-misunderstood-genius-of-russell-westbrook.html
// https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html


function parse_body(body) {
	const $ = cheerio.load(body);
	const woah = $('p');
	var i = 0;
	var sections = [];
	while(i < woah.length){
		sections.push(woah[i].children[0].data);
		i ++;
	}
	console.log(sections);
}

function init_article(address) {
   	var options = {
    	url: 'https://mercury.postlight.com/parser?url=' + address,
    	headers: headers
	};
    request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
    		parse_body(body);
    	}
	});
}

init_article("https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html");

app.get("/", function(req, res) {
    res.send("Hello World");
});

var server = app.listen(3000, function () {
    console.log("Listening on port %s...", server.address().port);
});