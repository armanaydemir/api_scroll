var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var moment = require('moment')
import Mercury from '@postlight/mercury-parser';
var politico_api = "eacb0f942382464a9193148875c93431"
var nyt_key = "Mgbw0wTgMWZQezAzmYBPmSFG2jFgRLi2" // new york times api key for top stories

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = "mongodb://localhost:27017/";
var sessionsCollection = 'sessions01'
var articlesCollection = 'articles01'
var database = 'data034'

const version = "v0.3.4"

console.log('started at least')

/*
things to do
------------------
look into CFAbsoluteTime vs Date()
	- maybe just have both???
improve vis.py and make it take arguments
email mike about viss and new updates
add politico/other news sites scrapers (npr, cnn) , apple news api


better practices
-------------------
batch requests
dont do dynamic sizing computation every time


data sources we can add
--------------------
add camera to see if they are looking at screen if its easy enough
add finger positioning
*/

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
	//const title = JSON.parse(body).title
	//sections.push(title)
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

function scrape_top(callback) {
	request.get({
	  url: "https://api.nytimes.com/svc/topstories/v2/home.json",
	  qs: {
	    'api-key': nyt_key
	  },
	}, function(err, response, body) {
		console.log(err)
		if(err) throw err;
	 	body = JSON.parse(body);
	 	r = body.results
	 	i = 0
	 	syncer = 0
	 	var tops = []
	 	
	 	while(r && i < r.length){
//	 		console.log(r[i].title)
	 		add_article(r[i] , function(a){
	 			// if(syncer == 1){
	 			// 	console.log(tops)
	 			// }
	 			syncer ++
	 			if(a){tops.push(a)}
	 			if(!(syncer < r.length)){
	 				
	 				callback(tops);
	 			}
	 		})
	 		i++
	 	}
	})
}

function add_article(data, callback) {
	abstract = data.abstract
	data.address = data.url
	data.address = data.address.split('.html')[0]
	var link = data.address.split('/')
	data.date_written = link.slice(3, 6).join('/')
	data.category = link.slice(6, link.length-1).join('/')
	data.address = data.address + '.html'
	//console.log('add_Article')
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		dbd.collection(articlesCollection).findOne({'article_link': data.address}, function(err, result){
			if(err) throw(err);
			if(!result){
				//console.log('new article scrape')
				var options = {
					url: data.address
				};
				console.log(data)
				Mercury.parse(options.url).then(result => console.log(result));
				// request(options, function(error, response, body) { if(error) throw(error);
				// 	if (!error && response.statusCode == 200) {
						
				// 		// need to test this function
				// 		var text = parse_body(body);
				// 		console.log(text)
				// 		// dbd.collection(articlesCollection).insertOne({'abstract': data.abstract, 'text': text, 'article_link':data.address, 'title': text[0], 'date_written': data.date_written, "category": data.category, "version":version}, function(e, resu){ if (e) throw e; 
				// 		// 	db.close()
				// 		// 	callback(resu)
				// 		// })
						
				// 	}else{
				// 		console.log(body)
				// 		console.log(response)
				// 		console.log('error: ' + error)
				// 		callback(null)
				// 	}
				// });
			}else{
				db.close()
				//console.log(result)
				callback(result)
			}
		})
	
	})
	
}



function init_article(data, res) { //need to fix this function to be same as add_Article
	var address = data.article_link
	if(!address.includes("https://www.nytimes.com")){
		console.log('isnt nytimes, this should be fun lol')
	}
	address = address.split('.html')[0] + '.html'

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		dbd.collection(articlesCollection).findOne({'article_link': address}, function(err, result){
			if(err) throw err;
			if(!err && result){
				var text = result.text
				dbd.collection(sessionsCollection).insertOne({'UDID': data.UDID, 'article_id': result._id, 'startTime': data.startTime, 
									'endTime': '', 'version': data.version, 'type': data.type, 'completed':false}, function(e, ress){ 
					if (e) throw e; 
					//console.log(ress.insertedId)
					text.unshift(ress.insertedId); 
					res.send(text);
				});
				db.close()
			}else{
				//console.log('new article scrape')
				var options = {
					url: 'https://mercury.postlight.com/parser?url=' + address,
					headers: headers
				};
				request(options, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						var text = parse_body(body);
						dbd.collection(articlesCollection).insertOne({'text': text, 'article_link':address, 'title': text[0], 'date_written': data.date_written, 'category': data.category, 'version':version}, function(e, res){
							if (e) throw e; 
							console.log('woah')
							console.log(sessionsCollection)
							dbd.collection(sessionsCollection).insertOne({'UDID': data.UDID, 'article_id': res._id, 'startTime': data.startTime, 
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
	scrape_top(function(tops){
		//console.log(tops)
		res.send(tops)
	})
});

app.post("/open_article", function(req, res) {
	//console.log('open article')
	var data = req.body

	data.article_link = data.article_link.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');
	// console.log(data.article_link + ' : ' + data.UDID);s
	// console.log(': ' + data.startTime + ' :')
	// console.log('----------')
    init_article(data, res);
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
		//console.log(data.UDID + s)
  		dbd.collection(data.UDID + s).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});

app.post("/close_article", function(req,res){
	var data = req.body

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(database)
		if (err) throw err; 
		var s = new ObjectId(data.session_id)

		var q = {'_id': s}
		//console.log(data.content)
		var nv = {$set:{"portait": data.portrait, "content": data.content, "word_splits": data.word_splits, "character_splits": data.character_splits, "completed": data.complete, "endTime": data.time}}
		dbd.collection(sessionsCollection).updateOne(q, nv, function(err, result){
			if(err) throw err
			// console.log('one updated')
			// console.log(data.session_id + ' : ' + data.UDID);
			// console.log(data.startTime + ' : ' + data.time)
			// console.log('===========')
			db.close()
		});
	});

	res.sendStatus(200)
});












var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});






