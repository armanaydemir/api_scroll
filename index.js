var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var moment = require('moment')

var politico_api = "eacb0f942382464a9193148875c93431"
var nyt_key = "1ee97e209fe0403fb34042bbd31ab50f" // new york times api key for top stories

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = "mongodb://localhost:27017/";

const version = "v0.2.6"

console.log('started at least')

//fix stuff for spacer lines in line_splits
//fix title to only go as wide as article
//make sure phone can't change anything
//changing times new roman
//making text size bigger, making ipad more equivalent to iphone reading content, lock 
//focus line 
//number of times words or certain strings repeat
//exponential average

//add camera to see if they are looking at screen if its easy enough


//--------------------------------
//get a few back up nyt_keys and switch between them
//add finger positioning


//using matplotlib and pandas
//amount of time line spends on screen
//average time between scrolls
//average amount time spent on article
//make a frequency graph (hours of day on y and days of week on x, point whenever article is read) 
//time spent on lines depending on line location in article
//read up on natural language process

//add politico/other news sites scrapers (npr, cnn)

//figure out how to translate time from CFAbsolute to normal (http://home.max-weller.de/test/cfabsolutetime/)

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
	//console.log(title);
	return sections;
}

function scrape_top() {
	request.get({
	  url: "https://api.nytimes.com/svc/topstories/v2/home.json",
	  qs: {
	    'api-key': nyt_key
	  },
	}, function(err, response, body) {
		if(err) throw err;
	 	body = JSON.parse(body);
	 	r = body.results
	 	i = 0
	 	//console.log(r)
	 	while(r && i < r.length){
	 		add_article(r[i].url)
	 		i++
	 	}
	})
}

function add_article(address, callback) {
	address = address.split('.html')[0]
	var link = address.split('/')
	date_written = link.slice(3, 6).join('/')
	category = link.slice(6, link.length-1).join('/')
	address = address + '.html'
	console.log('add_Article')
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		dbd.collection('articles').findOne({'article_link': address}, function(err, result){
			if(err) throw(err);
			if(!result){
				console.log('new article scrape')
				var options = {
					url: 'https://mercury.postlight.com/parser?url=' + address,
					headers: headers
				};
				request(options, function(error, response, body) { if(error) throw(error);
					if (!error && response.statusCode == 200) {
						// need to text this function
						var text = parse_body(body);
						console.log(address)
						console.log(text[0])
						dbd.collection('articles').insertOne({'text': text, 'article_link':address, 'title': text[0], 'date_written': date_written, "category": category, "version":version}, function(e, res){ if (e) throw e; 
							db.close()
							console.log(res)
							callback(res)
						})
						
					}else{
						console.log('error: ' + error)
					}
				});
			}else{
				db.close()
				console.log(result)
				callback(result)
			}
		})
	
	})
	
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


function init_article(data, res) {
	var address = data.article_link
	if(!address.includes("https://www.nytimes.com")){
		console.log('isnt nytimes, this should be fun lol')
	}
	address = address.split('.html')[0] + '.html'

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		dbd.collection('articles').findOne({'article_link': address}, function(err, result){
			if(err) throw err;
			if(!err && result){
				var text = result.text
				dbd.collection('sessions').insertOne({'UDID': data.UDID, 'article_id': result._id, 'startTime': data.startTime, 
									'endTime': '', 'version': data.version, 'type': data.type, 'completed':false}, function(e, ress){ 
					if (e) throw e; 
					//console.log(ress.insertedId)
					text.unshift(ress.insertedId); 
					res.send(text);
				});
				db.close()
			}else{
				console.log('new article scrape')
				var options = {
					url: 'https://mercury.postlight.com/parser?url=' + address,
					headers: headers
				};
				request(options, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						var text = parse_body(body);
						dbd.collection('articles').insertOne({'text': text, 'article_link':address, 'title': text[0], 'date_written': data.date_written, 'category': data.category, 'version':version}, function(e, res){
							if (e) throw e; 
							dbd.collection('sessions').insertOne({'UDID': data.UDID, 'article_id': res._id, 'startTime': data.startTime, 
								'endTime': '', 'version': data.version, 'type': data.type, 'completed': false}, function(e, ress){ 
								if (e) throw e;
								text.unshift(ress.insertedId); 
								res.send(text);
						    });
							db.close()
						});
					}else{
						console.log('error: ' + error)
						res.send(error);
					}
				});
			}
		})
	});
}


app.get('/articles', function(req, res){
	request.get({
	  url: "https://api.nytimes.com/svc/topstories/v2/home.json",
	  qs: {
	    'api-key': nyt_key
	  },
	}, function(err, response, body) {
		if(err) throw err;
	 	body = JSON.parse(body);
	 	r = body.results
	 	i = 0
	 	var tops = []
	 	r.forEach((article) => {
	 		var abstract = article.abstract
	 		var address = article.url
		 	address = address.split('.html')[0]
			var link = address.split('/')
			date_written = link.slice(3, 6).join('/')
			category = link.slice(6, link.length-1).join('/')
			address = address + '.html'
			console.log('add_Article')
				MongoClient.connect(url, function(e, db) {
				if(e) throw e;
				var dbd = db.db('data')
				dbd.collection('articles').findOne({'article_link': address}, function(err, result){
					if(err) throw(err);
					if(!result){
						dbd.collection('nytimes_lib').insertOne(article, function(err, res){if(err) throw err;})
						console.log('new article scrape')
						var options = {
							url: 'https://mercury.postlight.com/parser?url=' + address,
							headers: headers
						};
						request(options, function(error, response, body) { if(error) throw(error);
							if (!error && response.statusCode == 200) {
								// need to text this function
								var text = parse_body(body);
								//console.log(address)
								//console.log(text[0])
								dbd.collection('articles').insertOne({'text': text, 'abstract': abstract, 'article_link':address, 'title': text[0], 'date_written': date_written, "category": category, "version":version}, function(e, red){ if (e) throw e; 
									db.close()
									i++
									if(red.title != null){tops.push(red)}
									if(i === r.length){
										console.log(tops)
										res.send(tops)
									}
								})
								
							}else{
								console.log('error: ' + error)
							}
						});
					}else{
						db.close()
						i++
						if(result.title != null){tops.push(result)}
						if(i === r.length){
							console.log(tops)
							res.send(tops)
						}
					}
				})
			})
		})
		console.log('after r loop')
	})
});

app.post("/open_article", function(req, res) {
	console.log('open article')
	var data = req.body

	data.article_link = data.article_link.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.article_link + ' : ' + data.UDID);
	console.log(': ' + data.startTime + ' :')
	console.log('----------')
    init_article(data, res);
    res.sendStatus(200)
});

app.post("/submit_data", function(req, res) {
	var data = req.body
	//console.log('submit data')
	//article link and UDID stuffs
	data.article = data.article.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("sessions") // maybe change the name of this db
		if (err) throw err;
		var s = data.startTime.toString().split('.')[0]
  		dbd.collection(data.UDID + s).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});

app.post("/close_article", function(req,res){
	var data = req.body

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db('data')
		if (err) throw err; 
		var s = new ObjectId(data.session_id)

		var q = {'_id': s}
		var nv = {$set:{"line_splits": data.line_splits, "completed": data.complete, "endTime": data.time}}
		dbd.collection('sessions').updateOne(q, nv, function(err, result){
			if(err) throw err
			console.log('one updated')
			console.log(data.session_id + ' : ' + data.UDID);
			console.log(data.startTime + ' : ' + data.time)
			console.log('===========')
			db.close()
		});
	});

	res.sendStatus(200)
});














var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});






