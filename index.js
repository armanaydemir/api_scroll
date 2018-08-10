var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var moment = require('moment')

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/scrollData";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});

console.log('started at least')


//starting with first line of article at bottom, users scrolls first line to situate it to comfortable postition
//add blank space to bottom so bottom line can be at the top

// text at top of line - get time appear and time left 


// https://www.nytimes.com/2017/02/01/magazine/the-misunderstood-genius-of-russell-westbrook.html
// https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html
// https://www.nytimes.com/2017/11/21/technology/bitcoin-bitfinex-tether.html

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

function parse_body(body) {
	const title = JSON.parse(body).title
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	var sections = []; 
	sections.push(title)
	while(i < bodies.length){
		var o = 0;
		var subsections = [];
		//console.log(bodies[i].children.length)
		while(o < bodies[i].children.length){
			if(bodies[i].children[o].type == 'text'){
				subsections.push(bodies[i].children[o].data.replace('\\n',''));
				//console.log(bodies[i].children[o].data)
			}
			else if(bodies[i].children[o].type == 'tag' && bodies[i].children[o].children.length > 0 && bodies[i].children[o].children[0].data){
				//console.log(bodies[i].children[o].children[0])
				subsections.push(bodies[i].children[o].children[0].data.replace('\\n',''));
				
			}
			o ++;
		}	
		//console.log(subsections);
		//console.log(subsections.join(''));
		//console.log('------------------------')
		sections.push(subsections.join(''));
		i ++;
	}
	console.log(title);
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

function test_article(address) {
	var options = {
    	url: 'https://mercury.postlight.com/parser?url=' + address,
    	headers: headers
	};
    request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
    		console.log(parse_body(body));
    	}else{
	    	console.log('error: ' + error)
	    }
	});
}

test_article("https://www.nytimes.com/2017/11/21/technology/bitcoin-bitfinex-tether.html")
//test_article("https://mobile.nytimes.com/2018/05/22/technology/amazon-facial-recognition.html?rref=collection%2Fsectioncollection%2Ftechnology&action=click&contentCollection=technology&region=rank&module=package&version=highlights&contentPlacement=1&pgtype=sectionfront")


app.get("/", function(req, res) {
	var data = req.query
	console.log(data.articleLink);
    init_article(data.articleLink, res);
});

app.post("/close_article", function(req,res){
	var data = req.body
	data.article = data.article.split('.html')[0]
	var link = data.article.split('/')
	data.article = link[link.length-1]
	data.time = moment(data.time).unix()
	data.startTime = moment(data.startTime).unix()
	var filename = data.UDID + ':' + data.startTime + ':' + data.article + '.csv'
	fs.rename('temp/' + filename, 'data/' + filename)

	res.sendStatus(200)
});

app.post("/submit_data", function(req, res) {
	var data = req.body
	data.article = data.article.split('.html')[0]
	var link = data.article.split('/')
	data.article = link[link.length-1]
	data.time = moment(data.time).unix()
	data.appeared = moment(data.appeared).unix()
	console.log(data)
	//var csvify = [data.UDID, data.type, data.article, data.startTime, data.time, JSON.stringify(data.text)];
  	//fs.appendFileSync('temp/' + data.UDID + ':' + data.startTime + ':' + data.article + '.csv', csvify.join() + '\n')

	res.sendStatus(200)
});

var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});