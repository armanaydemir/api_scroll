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





// for calling functions from terminal
module.exports = {'purge': purge_incomplete, 'wipe': complete_wipe}
require('make-runnable');



