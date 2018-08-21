var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

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
//			documents: UDID, last_line - what the new last line is, first_line - what the first line is right now, 
//					   content_offset - how much user has scrolled, article - same as article_link in articles collection, articleTitle - same as db_link in articles collection,
//					   appeared - time when previous last line appeared, startTime - same as startTime in sessions collection, time - time when data was sent to server (given by phone)
// 
// will add previous last line to sessions db documents which is what the last line was (can help figure out which direction is going, also helps when last line is empty string)
// ----------------------------------------------------------------------------


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
module.exports = {'purge': purge_incomplete, 'wipe': complete_wipe, 'session_wipe': session_wipe, 'export': export_data}
require('make-runnable');



