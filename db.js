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



function purge_data() {
	MongoClient.connect(url, function(e, db){
		var dbsessions = db.db('sessions')
		var dbd = db.db('data')
		if(e) throw e;
		dbd.collection('sessions').find().toArray(function(error, c){
			if(error) throw error;
			const complete = c.map(x => x.session_db_link);	
			dbsessions.listCollections().toArray(function(err, s){
				if(err) throw err;
				console.log(complete)
				console.log(s)
				console.log(s.filter(id => complete.includes(id)))

			});
		});
	})
}


purge_data()




