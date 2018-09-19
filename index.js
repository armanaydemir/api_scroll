var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var moment = require('moment')

var nyt_key = "1ee97e209fe0403fb34042bbd31ab50f" // new york times api key for top stories

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

const version = "v0.2.0"

console.log('started at least')

//TODO
//keep pushing updates to hockey
//make tap to submit a centered button
//make size of tableview cells bigger on starting screen
//make sure all of database stuff is correct	
//get a bunch of nyt_keys and switch between them
//paginate the articles bc its getting toooo big
//add version_wipe
//---------------------------------------------------------------------------------------------------------------
//just ignore links with /interactive (only good nytimes articles (check on init article))
//add blank space to bottom so bottom line can be at the top
//black screen when article is loading... add spinner
//change the font to something better (same as nytimes??)
//---------------------------------------------------------------------------------------------------------------

//using matplotlib and pandas
//amount of time line spends on screen
//average time between scrolls
//average amount time spent on article
//make a frequency graph (hours of day on y and days of week on x, point whenever article is read) 
//time spent on lines depending on line location in article
//read up on natural language process

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

function add_article(address) {
	address = address.split('.html')[0]
	var link = address.split('/')
	date_written = link.slice(3, 6).join('/')
	category = link.slice(6, link.length-1).join('/')
	address = address + '.html'
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		dbd.collection('articles').findOne({'article_link': address}, function(err, result){
			if(err) throw err;
			if(!result){
				console.log('new article scrape')
				var options = {
					url: 'https://mercury.postlight.com/parser?url=' + address,
					headers: headers
				};
				request(options, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						// need to text this function
						var text = parse_body(body);
						console.log(address)
						console.log(text[0])
						dbd.collection('articles').insertOne({'text': text, 'article_link':address, 'title': text[0], 'date_written': date_written, "category": category, "version":version}, function(e, res){ if (e) throw e; })
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


function init_article(data, res) {
	var address = data.article_link
	if(!address.includes("https://www.nytimes.com")){
		print('isnt nytimes, this should be fun lol')
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
									'endTime': '', 'version': data.version, 'type': data.type, 'completed':false}, function(e, ress){ if (e) throw e; text.unshift(ress._id); res.send(text);});
				
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
								'endTime': '', 'version': data.version, 'type': data.type, 'completed': false}, function(e, ress){ if (e) throw e; text.unshift(ress._id); res.send(text);});
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


app.get("/open_article", function(req, res) {
	var data = req.query
	data.article_link = data.article_link.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');

	console.log(data.article_link);
    init_article(data, res);
});

app.get('/articles', function(req, res){
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db('data')
		var order = {_id: -1};
		dbd.collection('articles').find().sort(order).toArray(function(err, results){
			if(err) throw err;
			console.log(results)
			res.send(results)
			db.close()
		});
	});
});

//need db close
app.post("/close_article", function(req,res){
	var data = req.body

	console.log(data)

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db('data')
		if (err) throw err; 
		console.log(data.article_link)
		console.log(data.UDID)
		var q = {'_id': data.session_id}
		var nv = {$set:{"completed": true, "endTime": data.time}}
		dbd.collection('sessions').updateOne(q, nv, function(err, result){
			if(err) throw err
			console.log('one updated')
			db.close()
		});
	});

	res.sendStatus(200)
});

app.post("/submit_data", function(req, res) {
	var data = req.body

	//article link and UDID stuffs
	data.article = data.article.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');
	
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db("sessions") // maybe change the name of this db
		if (err) throw err;
  		dbd.collection(data.UDID + data.startTime).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});





















var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});

scrape_top()
setInterval(scrape_top, 1000 * 60 * 60)







