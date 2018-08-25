var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var request = require('request');
const cheerio = require('cheerio')

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};


//"schema" for this db 
// ---------------------------------------------------------------------------
// db: data (contains everything but actual session data)
// 		collection: articles (for now contains every article read, but can later add scraper to this)
//			document: text - where we save the article text, db_link - version of title that is used in session db, article_link - link to article at nytimes.com,
//					  title - normal title shown at top of article and in list of articles
//		collection: sessions (contains all completed reading sessions, actually session data is in session db though)
//			document: UDID - id for that specific phone, article_db_link - same as db_link in articles collection, startTime - when session started, endTime - when session closed,
//					  session_db_link - link to this session's collection in the sessions db (see below)
// db: sessions (each collection holds scrolling data for specfic session)			  
//		collection: UDID + article_db_link + startTime (each title of collection is combination of these, should be same as session_db_link above)
//			(new document every time a new last line appears)
//			documents: UDID, last_line - what the new last line is, first_line - what the first line is right now, previous_last_line - what the previous last line is
//					   content_offset - how much user has scrolled, article - same as article_link in articles collection, articleTitle - same as db_link in articles collection,
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

// purges sessions that were never 'tapped to submit'
// we need a db.close in here but im taking it out for debug
var  purge_incomplete = function() {
	console.log('purge')
	MongoClient.connect(url, function(e, db){
		var dbsessions = db.db('sessions')
		var dbd = db.db('data')
		if(e) throw e;
		dbd.collection('sessions').find().toArray(function(error, c){
			if(error) throw error;
			const complete = c.map(x => x.session_db_link);	
			dbsessions.listCollections().toArray(function(err, s){
				if(err) throw err;
				var sessions = s.map(x => x.name);
				sessions = sessions.filter(id => complete.indexOf(id) == -1 || id != 'system.indexes') //filtering out the completed sessions
				console.log(sessions)
				sessions.forEach(function(e){ //deleting each incompete session
					dbsessions.dropCollection(e, function(derr, del){
						if(derr) throw derr
						if(!del) console.log('unable to delete' + e)
					})
				});
			});
		});
	})
}

// purges all session data (deletes everything but the articles)
var session_wipe = function() {
	console.log('session wipe')
	MongoClient.connect(url, function(e, db){
		var dbsessions = db.db('sessions')
		var dbd = db.db('data')
		if(e) throw e;
		dbd.dropCollection('sessions', function(err,r){
			if(err) throw err
		})
		dbsessions.dropDatabase(function(err, r){
			if(err) throw err
		})
	})
}


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
module.exports = {'purge': purge_incomplete, 'wipe': complete_wipe, 'session_wipe': session_wipe, 'export': export_data, 'add_article': add_article}
require('make-runnable');



