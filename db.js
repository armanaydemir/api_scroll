var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

function export_data() {
	MongoClient.connect(url, function(e, db){
		if(e) throw e;
		var dbd = db.db('data')
		var dbsessions = db.db('sessions')
		dbd.collection('sessions').find().toArray(function(err, sessions){
			if(err) throw err;
			console.log(sessions)
			db.close()
		});
	})
}



// function purge_data() {
// 	MongoClient.connect(url, function(e, db){
// 		if(e) throw e;
// 	})
// }


// function delete_data() {

// }

export_data()

