var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');

// to do
console.log('started at least')
// change api route on app side to /article instead of /
//test with different articles and phone types to make sure data is valid
//give list of article to select from to start with



// https://www.nytimes.com/2017/02/01/magazine/the-misunderstood-genius-of-russell-westbrook.html
// https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html
// https://www.nytimes.com/2017/11/21/technology/bitcoin-bitfinex-tether.html

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

function parse_body(body) {
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	var sections = []; 
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
	return sections;
}

function init_article(address, res) {
   	var options = {
    	url: 'https://mercury.postlight.com/parser?url=' + address,
    	headers: headers
	};
    request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
    		res.send(parse_body(body));
    	}else{
	    	console.log('error: ' + error)
	    	res.send(error);
	    }
	});
}

app.get("/test", function(req, res) {
	res.send('hi this test worked')
});

app.get("/article", function(req, res) {
	var data = req.query
	console.log(data.articleLink);

    init_article(data.articleLink, res);
});

app.post("/submit_data", function(req, res) {
	var data = req.body
	console.log(data)
	var link = data.article.split('/')
	link = link[link.length-1]
	var csvify = [data.time, data.top_line, data.top_section, data.bottom_line, data.bottom_section];
	fs.appendFileSync(data.device_id +':' + data.device_type+ ':' + data.startTime + ':' + link + '.csv', csvify.join() + '\n')
	res.sendStatus(200)
});

var server = app.listen(433, function () {
    console.log("Listening on port %s...", server.address().port);
});