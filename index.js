var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var moment = require('moment')

var nyt_key = "24d73377812a46e88fdaa3ecb8c0d935" // new york times api key for top stories

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

const version = "v0.1.1"

console.log('started at least')

//TODO
//change sessions db collection names and session_db_link to ID
//no more article_db_link in session or db_link in articles collection, just article id
//add version to article and sessions collections
//keep pushing updates to hockey
//
//---------------------------------------------------------------------------------------------------------------
//just ignore links with /interactive (only good nytimes articles (check on init article))
//add blank space to bottom so bottom line can be at the top
//black screen when article is loading... add spinner
//change the font to something better (same as nytimes??)
//---------------------------------------------------------------------------------------------------------------


//figure out how to translate time from CFAbsolute to normal (http://home.max-weller.de/test/cfabsolutetime/)

// https://www.nytimes.com/2017/02/01/magazine/the-misunderstood-genius-of-russell-westbrook.html
// https://www.nytimes.com/2017/11/22/us/politics/alliance-defending-freedom-gay-rights.html
// https://www.nytimes.com/2017/11/21/technology/bitcoin-bitfinex-tether.html
// https://www.nytimes.com/2018/08/12/movies/the-meg-surprise-box-office-monster.html
// https://www.nytimes.com/2018/08/10/arts/design/tulsa-park-gathering-place.html
// https://www.nytimes.com/2018/08/13/world/europe/erdogan-turkey-lira-crisis.html
// https://www.nytimes.com/2018/08/16/technology/google-employees-protest-search-censored-china.html
// https://www.nytimes.com/2018/08/18/business/west-democracy-turkey-erdogan-financial-crisis.html
// https://www.nytimes.com/2018/08/25/business/elon-musk-tesla-private.html
// https://www.nytimes.com/2018/09/02/arts/television/tv-writers-diversity.html
// https://www.nytimes.com/2018/09/08/reader-center/anonymous-op-ed-trump.html

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

function scrape_top() {
	request.get({
	  url: "https://api.nytimes.com/svc/topstories/v2/home.json",
	  qs: {
	    'api-key': nyt_key
	  },
	}, function(err, response, body) {
	 	body = JSON.parse(body);
	 	r = body.results
	 	i = 0
	 	while(i < r.length){
	 		add_article(r[i].url)
	 		i++
	 	}
	})
}

function add_article(address) {
	address = address.split('.html')[0]
	var link = address.split('/')
	var db_link = link[link.length-1].replace(/-/g,'_')
	date_written = link.slice(3, 6).join('/')
	category = link.slice(6, link.length-1).join('/')
	address = address + '.html'
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		dbd.collection('articles').findOne({'db_link': db_link}, function(err, result){
			if(err) throw err;
			if(result){
				console.log("already added")
			}else{
				console.log('new article scrape')
				var options = {
					url: 'https://mercury.postlight.com/parser?url=' + address,
					headers: headers
				};
				request(options, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						// need to text this function
						var text = parse_body(body);
						console.log(text)
						console.log(db_link)
						console.log(address)
						console.log(text[0])
						dbd.collection('articles').insertOne({'text': text, 'db_link': db_link, 'article_link':address, 'title': text[0], 'date_written': date_written, "category": category}, function(e, res){ if (e) throw e; })
						db.close()
					}else{
						console.log('error: ' + error)
					}
				});
			}
		})
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
	if(!address.includes("https://www.nytimes.com")){
		print('isnt nytimes')
	}
	var l = address.split('.html')[0]
	l = l.split('/')
	var db_link = l[l.length-1].replace(/-/g,'_')

	console.log(db_link)

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		dbd.collection('articles').findOne({'db_link': db_link}, function(err, result){
			if(err) throw err;
			db.close()
			if(!err && result){
				res.send(result.text)
			}else{
				console.log('new article scrape')
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
		})
	});
}


app.get("/", function(req, res) {
	var data = req.query
	data.article_link = data.articleLink.split('.html')[0] + '.html'
	console.log(data.articleLink);
    init_article(data.articleLink, res);
});

app.get('/articles', function(req, res){
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		var order = {_id: 1};
		dbd.collection('articles').find().sort(order).toArray(function(err, results){
			if(err) throw err;
			console.log(results)
			res.send(results)
			db.close()
		});
	});
});


app.post("/close_article", function(req,res){
	var data = req.body
	//article link and UDID stuffs
	data.article = data.article.split('.html')[0]
	var link = data.article.split('/')
	data.article_link = data.article + '.html'
	data.articleTitle = link[link.length-1].replace(/-/g, '_');
	data.UDID = data.UDID.replace(/-/g, '_');
	data.date_written = link.slice(3, 6).join('/')
	data.category = link.slice(6, link.length-1).join('/')

	
	console.log(data)

	data.db_link = data.UDID + data.articleTitle + data.startTime

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db('data')
		if (err) throw err; 
		dbd.collection('sessions').insertOne({'UDID': data.UDID, 'article_db_link': data.articleTitle, 'startTime': data.startTime, 
									'endTime': data.time, 'session_db_link': data.db_link }, function(e, res){ if (e) throw e; });
		dbd.collection('articles').findOne({'db_link': data.articleTitle}, function(err, result){
			if(!result & !err) dbd.collection('articles').insertOne({'text': data.text, 'db_link': data.articleTitle, 'article_link':data.article_link, 'title': data.title,
														'date_written': data.date_written, 'category': data.category}, function(e, res){ if (e) throw e; });
			db.close()
		})
	
	});

	res.sendStatus(200)
});

app.post("/submit_data", function(req, res) {
	var data = req.body

	//article link and UDID stuffs
	data.article = data.article.split('.html')[0]
	var link = data.article.split('/')
	data.article = data.article + '.html'
	data.articleTitle = link[link.length-1].replace(/-/g, '_');
	data.UDID = data.UDID.replace(/-/g, '_');

	console.log(data)
	
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("sessions") // maybe change the name of this db
		if (err) throw err;
  		dbd.collection(data.UDID + data.articleTitle + data.startTime).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});





















var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});

setInterval(scrape_top, 10000)







