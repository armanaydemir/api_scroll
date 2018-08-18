var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";


//need to finish this ... export to csv??
function export_data() {
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
function purge_incomplete() {
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
				sessions = sessions.filter(id => complete.indexOf(id) == -1) //filtering out the completed sessions
				console.log(sessions)
				sessions.forEach(function(e){ //deleting each incompete session
					dbsessions.dropCollection(e, function(derr, del){
						if(derr) throw derr
						if(!del) console.log('unable to delete' + e)
					})
				});
				db.close()
			});
		});
	})
}

// function complete_wipe() {
// 	MongoClient.connect(url, function(e, db){
// 		var dbsessions = db.db('sessions')
// 		var dbd = db.db('data')
// 		if(e) throw e;

// 	})
// }


purge_incomplete()




