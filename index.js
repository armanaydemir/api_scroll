var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');
var fs = require('fs');
var KalmanFilter = require('kalmanjs')
var kf = new KalmanFilter();
//var moment = require('moment')
var Mercury = require('@postlight/mercury-parser')
var politico_api = "eacb0f942382464a9193148875c93431"
var nyt_key = "Mgbw0wTgMWZQezAzmYBPmSFG2jFgRLi2" // new york times api key for top stories

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = "mongodb://localhost:27017/";

var sessionsCollection = 'complete_sessions01'
var articlesCollection = 'complete_articles01'
var emailsCollection = "complete_emails01"

//very important
var database = 'data037temp69'

var old_db = 'data'
var old_sessions = 'sessions'
var old_articles = 'articles'
var combined_sessions_collection = 'complete_sessions01'
var combined_articles_collection = 'complete_articles01'
var emails_collection = "complete_emails01"


var sessions_db = 'sessions18'
var events_db = 'events18'




//complete_sessions01
//complete_articles01

// var sessionsCollection = 'complete_sessions01'
// var articlesCollection = 'complete_articles01'
// var database = 'data034'

// var old_db = 'data'
// var old_sessions = 'sessions'
// var old_articles = 'articles'
// var combined_sessions_collection = 'complete_sessions01'
// var combined_articles_collection = 'complete_articles01'


var new_articles = 'new_artilces'

const version = "v0.3.7"

console.log('started at least')

spaceLabelHeightRatio = 0.25
maxLines = 20
maxChars = 55
/*
things to do
------------------
look into CFAbsoluteTime vs Date()
	- maybe just have both???
improve vis.py and make it take arguments
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

function parse_body(result) {
	var body = result.content
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	var sections = []; 
	const title = result.title
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
	//console.log(title);
	return sections;
}

function parse_lines(text) {
	var content = []
	var i = 1
	content.push(text[0])
	while(i < text.length){
		var t = text[i]
		if(t == ""){
			content.push(t)
		}else{
			var regex = /\s*(?:(\S{30})|([\s\S]{1,30})(?!\S))/g;
			var cstring = t.replace(regex, function($0,$1,$2) { return $1 ? $1 + "-\n" : $2 + "\n"; } )
			// console.log(t)

			// console.log(cstring)
			var clist = cstring.split("\n")
			
			var ii = 0
			while(ii < clist.length){
				// console.log(clist[ii])
				content.push(clist[ii])
				ii += 1
			}
		}
		i += 1
	}
	// setInterval(myTimer, 1000)
	// console.log(content)
	// console.log("=")
	return content
}

function scrape_top(callback) {
	request.get({
	  url: "https://api.nytimes.com/svc/topstories/v2/home.json",
	  qs: {
	    'api-key': nyt_key
	  },
	}, function(err, response, body) {
		// console.log(err)
		if(err) throw err;
	 	body = JSON.parse(body);
	 	//r = [body.results[0]]
	 	r = body.results
	 	// console.log(r[0].title)
	 	r.map(function(data){
	 		add_article(data, function(result){
	 			return result
	 		})
	 	})
	 	// console.log(r[0].article_link)
// 	 	i = 0
// 	 	syncer = 0
// 	 	var tops = []
// 	 	console.log(r)
// 	 	while(r && i < r.length){
// //	 		console.log(r[i].title)
// 	 		add_article(r[i] , function(result,input){
// 	 			// if(syncer == 1){
// 	 			// 	console.log(tops)
// 	 			// }
// 	 			a = result
// 	 			syncer ++
// 	 			if(a){tops.push(a)}
// 	 			if(!(syncer < r.length)){
// 	 				callback(tops);
// 	 			}
// 	 		})
// 	 		i++
// 	 	}

		callback(r)
 	})
}

function add_article(data, callback) {
	data.address = data.url
	data.address = data.address.split('.html')[0]
	var link = data.address.split('/')
	data.address = data.address + '.html'
	data.date_written = link.slice(3, 6).join('/')
	data.category = link.slice(6, link.length-1).join('/')
	data.article_link = data.address
	//console.log('add_Article')
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		dbd.collection(combined_articles_collection).findOne({'article_link': data.address}, function(err, result){
			if(err) throw(err);
			if(!result){
				//console.log('new article scrape')
				var options = {
					url: data.address
				};
				// console.log(data)
				Mercury.parse(options.url).then(result => {
					data.text = parse_body(result)
					// console.log(data.text)
					data.content = parse_lines(data.text)
					data.title = data.text[0]
					data.version = version
					data.line_count = data.content.length
					//console.log(data)
					//console.log("----")
					//console.log(data.content)
					
					dbd.collection(combined_articles_collection).insertOne(data, function(e, resu){ if (e) throw e; 
						db.close()
						// console.log(resu.text)
						// console.log(resu.content)
						// console.log("----")
						callback(resu)
					})
				})
			}else{
				//console.log(result.content)
				db.close()
				callback(result)
			}
		})
	})	
}



function init_session(data, res) {
	//console.log(data)
	var address = data.article_link
	if(!address.includes("https://www.nytimes.com")){
		console.log('isnt nytimes, this should be fun lol')
	}
	address = address.split('.html')[0] + '.html'
	data.url = address
	add_article(data,function(result){
		MongoClient.connect(url, function(e, db) {
			if(e) throw e;
			var dbd = db.db(database)
			dbd.collection(combined_sessions_collection).insertOne({'UDID': data.UDID, 'article_id': result._id, 'startTime': data.startTime, 
			'endTime': '', 'version': data.version, 'type': data.type, 'completed': false}, function(e, ress){ 
				if (e) throw e;
				db.close()
				//console.log(ress)
				//console.log(result.content)
				
				var toReturn = {}
				toReturn.sessionID = ress.insertedId
				toReturn.article_data = result
				toReturn.max_lines = maxLines
				//console.log(result.sessionID)
				res.send(toReturn);
			});
		})
	})
}

app.get('/articles', function(req, res){
	scrape_top(function(tops){
		console.log("tops")
		//console.log(tops[0].title)
		res.send(tops)
	})
});

app.get('/identities', function(req,res){
	res.send([{"udid":"0B70C724_6597_4659_9322_E113E9403601","device":"iPhone9,1"}
		,{"udid":"35F7C004_7F5D_4C77_8E84_313FD79C77E0","device":"iPad6,11"}
		,{"udid":"828296DD_6B30_43B8_8986_8E12A13CD9F2","device":"iPhone9,1"}
		,{"udid":"8CE7904A_11BC_4E65_A236_00BAC8F51F6B","device":"iPhone9,3"}
		,{"udid":"93D9D52B_04D9_4532_A24B_D90B845A062E","device":"iPhone10,3"}
		,{"udid":"A48F157C_4768_44C9_86BF_6978C67BB756","device":"iPad7,3"}
		,{"udid":"ACE7A1BC_AB49_42A6_B276_2A0852E0B9EE","device":"iPhone8,1"}]
	)
})

async function sessions_article_helper(dbd,result){
	article_data = await dbd.collection(combined_articles_collection).findOne({'_id': ObjectId(result.article_id)})
	console.log(article_data)
	console.log(result.article_id)
	result.article_title = article_data.title
	result.article_data = article_data
	//console.log(article_data.text)
	return result
}

async function sessions_helper(dbd, results){
	return Promise.all(results.map(result => sessions_article_helper(dbd,result)))
}

//change this back to post
app.get('/sessions', function(req,res){
	var data = req.body
	//data.UDID = data.UDID.replace(/-/g, '_');
	//data.UDID = "828296DD_6B30_43B8_8986_8E12A13CD9F2"
	//console.log(data)

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database) //'UDID': data.UDID, 
		dbd.collection(combined_sessions_collection).find({}).sort({_id: -1}).toArray(async function(err, results) {
			if (err) throw err;
			//console.log(results)

			sessions_helper(dbd,results).then(data => {
				var tempi = 0
				var ccc = 0
				var new_data = []
				while(tempi < results.length){
					if(data[tempi].content && data[tempi].type != 'x86_64'){
						ccc = ccc + 1
						new_data.push(data[tempi])
					}
					tempi = tempi + 1
				}
				console.log("jabjabjab")
				console.log(ccc)
				console.log(tempi)
				res.send(data)
				//res.send(new_data)
				db.close()
			})
		})
	})
})
 
//change this back to post
app.get('/settings', function(req,res){
	var data = req.body
	console.log("settings")
	console.log(data)
	toReturn = {}
	toReturn.showReplays = true
	toReturn.showIntro = true
	res.send(toReturn)
})

app.get('/submit_email', function(req,res){
	var data = req.body
	console.log('submit_email')
	console.log(data)
})

app.post('/session_replay', function(req,res){
	console.log('session_replay')
	//in this context article link actual means session id

	//console.log(data)
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var data = req.body
		data.UDID = data.UDID.replace(/-/g, '_');
		console.log(data)
		var dbd = db.db(database)
		var dbsession = db.db(sessions_db)
		console.log(data.article_link)
		dbd.collection(combined_sessions_collection).findOne({'_id': ObjectId(data.article_link)}, function(err, result) {
		    if (err) throw err;
		    dbd.collection(combined_articles_collection).findOne({'_id': ObjectId(result.article_id)},function(er, article){
		    	if (er) throw er;
		    	result.article_data = article
		    	//article.text.unshift(data.article_link)
		    	result.paragraphs = article.text
		    	var s = result.startTime.toString().split('.')[0]
		    	dbsession.collection(result.UDID + s).find({}).toArray(function(errr, col){
		    		if (errr) throw errr;
		    		i = 0
		    		// max = 0
		    		// max_char = 0
		    		c = result.content
		    		// while(i < col.length){
		    		// 	if(col[i].last_cell - col[i].first_cell > max){
		    		// 		j = col[i].first_cell
		    		// 		count = 0
		    		// 		while(j < col[i].last_cell){
		    		// 			if(c[j].text.length > max_char){
		    		// 				max_char = c[j].text.length
		    		// 			}
		    		// 			if(c[j].text != ""){
		    		// 				count = count + 1
		    		// 			} else {
		    		// 				count = count + spaceLabelHeightRatio
		    		// 			}
		    		// 			j = j + 1
		    		// 		}
		    		// 		if(count > max){max = count}
		    		// 	}
		    		// 	i = i + 1
		    		// }
	    			result.session_data = col
	    			result.max_lines = maxLines
	    			// console.log("maxlines")
	    			// console.log(max)
	    			// console.log(max_char)
					res.send(result)
					db.close();
		    	})
		    })
		})
	})
})

app.get('/new_sessions', function(req,res){
	var data = req.body
	//console.log(data)
	data.UDID = data.UDID.replace(/-/g, '_');
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		//used to be sessionsCollection (before combination of old and new)
		dbd.collection(combined_sessions_collection).find({'UDID': data.UDID, 'completed':true}).toArray(function(err, result) {
		    if (err) throw err;
		    console.log(result.length);
		    res.send(result)
		    db.close();
		})
	})
})

app.get('/old_sessions', function(req,res){
	var data = req.body
	//console.log(data)
	data.UDID = data.UDID.replace(/-/g, '_');
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(old_db)
		dbd.collection(old_sessions).find({'UDID': data.UDID, 'completed':true}).toArray(function(err, result) {
			if (err) throw err;
		    console.log(result.length);
			res.send(result)
			db.close();
		})
	})
})

app.post("/open_article", function(req, res) {
	//console.log('open article')
	var data = req.body

	data.article_link = data.article_link.split('.html')[0] + '.html'
	data.UDID = data.UDID.replace(/-/g, '_');
	// console.log(data.article_link + ' : ' + data.UDID);s
	// console.log(': ' + data.startTime + ' :')
	// console.log('----------')
    init_session(data, res);
});

app.post("/submit_data", function(req, res) {
	var data = req.body
	//console.log('submit data')
	//article link and UDID stuffs
	if(data.article){
		data.article = data.article.split('.html')[0] + '.html'
	}
	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
		var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.UDID + s).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});


app.post("/submit_data_batched", function(req, res) {
	var data = req.body
	console.log('submit data batched')
	//article link and UDID stuffs
	if(data.article){
		data.article = data.article.split('.html')[0] + '.html'
	}
	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.data)
	//console.log(data.session_id)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
		var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.UDID + s).insertMany(data.data, function(e, ress){ 
  			if (e) throw e; 
  			toReturn = {}
  			res.send(toReturn)
  		});
  		db.close();
	});

	//res.sendStatus(200)
});

app.post("/submit_event", function(req, res) {
	var data = req.body
	console.log('submit event')
	//console.log(data)
	console.log("---")
	//article link and UDID stuffs
	if(data.article){
		data.article = data.article.split('.html')[0] + '.html'
	}
	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(events_db) 
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
		dbd.collection(combined_sessions_collection).updateOne(q, nv, function(err, result){
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











