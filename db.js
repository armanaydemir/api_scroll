var request = require('request');
const cheerio = require('cheerio');

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var headers = { 'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY' };
var nyt_key = "1ee97e209fe0403fb34042bbd31ab50f" // new york times api key for top stories


const version = "v0.3.1"
//"schema" for this db 
// add version to sessions collection 
// ---------------------------------------------------------------------------
// db: data (contains everything but actual session data)
// 		collection: articles (for now contains every article read, but can later add scraper to this)
//			document: text - where we save the article text, article_link - link to article at nytimes.com, category, abstract, 
//					  title - normal title shown at top of article and in list of articles, date_written - YYYY/MM/DD, version
//		collection: sessions (contains all completed reading sessions, actually session data is in session db though)
//			document: UDID - id for that specific phone, article_id - objectid of article in articles collection, startTime - when session started, type - what type of device was used for reading,
// 					   endTime - when session closed , completed -if they tapped to submit yet or not, version, 
//						content - word, character, text, and more info for each cell, portrait - if device was portait or not during reading
// db: sessions (each collection holds scrolling data for specfic session)			  
//		collection: UDID + startTime (each title of collection is combination of these)
//			(new document every time a new last line appears)
//			documents: UDID, last_cell - what the new last line is, first_cell - what the first line is right now, previous_last_cell - what the previous last line is, previous_first_cell
//					   content_offset - how much user has scrolled, article_id - links to article in articles collection,
//					   appeared - time when previous last line appeared, startTime - same as startTime in sessions collection, time - time when data was sent to server (given by phone),
//
// 
// ----------------------------------------------------------------------------

//node js - (no changes to scraper since v0.1.0)
//0.1.0 -> initial
//0.2.0 -> major updates to db and how we are storing sessions
//0.2.2 -> changing order to just be top stories
//0.2.4 -> adding ny_times db
//0.2.5 -> adding line splits to close article 
//0.2.6 -> line instead of word indexes
//0.2.7 -> adding word and character splits
//0.3.1 -> final changes for production (orientation) ... 0.3.2 will be official release
//0.3.3 -> making changes to article endpoint to hopefully get it consistent //ERROR occurred, we 


//xcode
//0.1.0 -> initial
//0.2.0 -> updates mainly to api calls to reflect updates
//0.2.4 -> adding pagination adn pull down to refresh to starting vc
//0.2.5 -> updates to how and what data we are submitting
//0.2.6 -> and sending line instead of word indexes
//0.2.7 -> maaaany ui changes and a whole refactore, also sending word, character, and content splits now
//0.3.1 -> final changes for production (orientation and nicer button)


//two of the exact same functions in index.js and db.js, should condense and call it from the other one
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
		while(o < bodies[i].children.length){
			if(bodies[i].children[o].type == 'text'){
				subsections.push(bodies[i].children[o].data.replace('\\n',''));
			}
			else if(bodies[i].children[o].type == 'tag' && bodies[i].children[o].children.length > 0 && bodies[i].children[o].children[0].data){
				subsections.push(bodies[i].children[o].children[0].data.replace('\\n',''));
				
			}
			o ++;
		}	
		sections.push(subsections.join(''));
		i ++;
	}
	console.log(title);
	return sections;
}

//adds article to article database so it can be seen on starting screens
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
						console.log(address)
						console.log(text[0])
						dbd.collection('articles').insertOne({'version':version, 'text': text, 'article_link':address, 'title': text[0], 'date_written': date_written, "category": category}, function(e, res){ if (e) throw e; })
						db.close()
					}else{
						console.log('error: ' + error)
					}
				});
			}
		})
	});
}

//need to finish this ... export 
var export_data = function(){
	MongoClient.connect(url, function(e, db){
		var dbd = db.db('data')
		var dbsessions = db.db('sessions')
		if(e) throw e;
		dbd.collection('sessions').find().toArray(function(err, sessions){
			if(err) throw err;
			console.log(sessions)
			db.close()
		});
	})
}

var combine_sessions = function() {
	var sessionsCollection = 'sessions01'
	var combined_sessions_collection = 'complete_sessions01'
	var combined_articles_collection = 'complete_articles01'
	var articlesCollection = 'articles01'
	var database = 'data034'
	var old_db = 'data'
	var old_sessions = 'sessions'
	var old_articles = 'articles'

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(old_db)
		var current_dbd = db.db(database)
		dbd.collection(old_sessions).find({}).toArray(function(err, result) {
			if (err) throw err;
			i = 0
			while(i < result.length){
				current_dbd.collection(combined_sessions_collection).insertOne(result[i])
				i+=1
			}
		})
		current_dbd.collection(sessionsCollection).find({}).toArray(function(err, result) {
			if (err) throw err;
			i = 0
			while(i < result.length){
				current_dbd.collection(combined_sessions_collection).insertOne(result[i])
				i+=1
			}
		})
		dbd.collection(old_articles).find({}).toArray(function(err, result) {
			if (err) throw err;
			i = 0
			while(i < result.length){
				current_dbd.collection(combined_articles_collection).insertOne(result[i])
				i+=1
			}
		})
		current_dbd.collection(articlesCollection).find({}).toArray(function(err, result) {
			if (err) throw err;
			i = 0
			while(i < result.length){
				current_dbd.collection(combined_articles_collection).insertOne(result[i])
				i+=1
			}
		})
	})
}


// purges all session data (deletes everything but the articles)
var session_purge = function() {
	console.log('session purge')
	MongoClient.connect(url, function(e, db){
		var dbsessions = db.db('sessions')
		var dbd = db.db('data')
		if(e) throw e;
		dbsessions.dropDatabase(function(err, r){
			if(err) throw err
			dbd.dropCollection('sessions', function(errr,r){
				if(errr) throw errr
				db.close()
			})
		})
	})
}

//add version wipe too


//wipes all data, complete restart... be carefullll need db close in here too
var complete_wipe = function() {
	console.log('wipe')
	MongoClient.connect(url, function(e, db){
		var dbsessions = db.db('sessions')
		var dbd = db.db('data')
		if(e) throw e;
		dbd.dropDatabase(function(err,r){
			if(err) throw err
		})
		dbsessions.dropDatabase(function(err, r){
			if(err) throw err
		})
	})
}

var test_top = function() {
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
	 	while(r && i < r.length){
	 		tops.push(add_article(r[i].url))
	 		i++
	 	}
	 	console.log(tops.length)
	 	console.log(tops[0])
	})
}





// for calling functions from terminal (can call each function like "node db.js purge" or "node db.js wipe")
module.exports = {'wipe': complete_wipe, 'purge': session_purge, 'export': export_data, 'add_article': add_article, 'test': test_top, 'combine':combine_sessions}
require('make-runnable');



