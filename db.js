var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var request = require('request');
const cheerio = require('cheerio')

const version = "v0.2.0"

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};


//"schema" for this db 
// add version to sessions collection 
// ---------------------------------------------------------------------------
// db: data (contains everything but actual session data)
// 		collection: articles (for now contains every article read, but can later add scraper to this)
//			document: text - where we save the article text, article_link - link to article at nytimes.com, category, 
//					  title - normal title shown at top of article and in list of articles, date_written - YYYY/MM/DD, version
//		collection: sessions (contains all completed reading sessions, actually session data is in session db though)
//			document: UDID - id for that specific phone, article_id - objectid of article in articles collection, startTime - when session started, type - what type of device was used for reading,
// 					   endTime - when session closed , completed -if they tapped to submit yet or not, version
// db: sessions (each collection holds scrolling data for specfic session)			  
//		collection: UDID + startTime (each title of collection is combination of these)
//			(new document every time a new last line appears)
//			documents: UDID, last_line - what the new last line is, first_line - what the first line is right now, previous_last_line - what the previous last line is
//					   content_offset - how much user has scrolled, article_id - links to article in articles collection,
//					   appeared - time when previous last line appeared, startTime - same as startTime in sessions collection, time - time when data was sent to server (given by phone),
//
// 
// ----------------------------------------------------------------------------



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

//need to finish this ... export to csv??
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





// for calling functions from terminal (can call each function like "node db.js purge" or "node db.js wipe")
module.exports = {'wipe': complete_wipe, 'purge': session_purge, 'export': export_data, 'add_article': add_article}
require('make-runnable');



