var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');

console.log('started at least')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

var sections = []

function parse_body(body) {
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	sections = []; 
	while(i < bodies.length){
		var o = 0;
		var subsections = [];
		//console.log(bodies[i].children.length)
		while(o < bodies[i].children.length){
			if(bodies[i].children[o].type == 'text'){
				subsections.push(bodies[i].children[o].data.replace('\\n',''));
				//console.log(bodies[i].children[o].data)
			}
			else if(bodies[i].children[o].type == 'tag'){
				subsections.push(bodies[i].children[o].children[0].data.replace('\\n',''));
				//console.log(bodies[i].children[o].children[0].data)
			}
			o ++;
		}	
		//console.log(subsections);
		//console.log(subsections.join(''));
		//console.log('------------------------')
		sections.push((i+1) + subsections.join('')); // i + 1 is for debugging
		i ++;
	}
	console.log(sections[sections.length-1]);
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
    	console.log(error)
    	console.log('waoijsadfl;kadjsf')
	});
}

// nytimes articles for testing -----
// https://www.nytimes.com/2017/02/01/magazine/the-misunderstood-genius-of-russell-westbrook.html
// https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html
// https://www.nytimes.com/2017/11/21/technology/bitcoin-bitfinex-tether.html

article = "https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html"

init_article(article);

article = article.split('/')
article = article[article.length -1]

app.get("/", function(req, res) {
    res.send(sections);
});

app.post("/submit_data", function(req, res) {
	var data = req.body
	fs.appendFileSync(data.device_id + ':' + data.startTime + ':' + article + '.csv', JSON.stringify(data) + '\n')
	res.sendStatus(200)
});

var server = app.listen(3000, function () {
    console.log("Listening on port %s...", server.address().port);
});