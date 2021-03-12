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

// VERY VERY IMPORTANT
var database = 'data_official'
var sessions_db = 'sessions_official'
var events_db = 'events_official'
var questions_db = 'questions_official'

var old_db = 'data'
var old_sessions = 'sessions'
var old_articles = 'articles'
var combined_sessions_collection = 'complete_sessions01'
var combined_articles_collection = 'complete_articles01'
var emails_collection = "complete_emails01"


var standard_questions = [
{
	"id": "1",
	"text": "Rate the quality of the article",
	"options": [		
		{"id": "1", "text": "Weak"},
		{"id": "2", "text": "Below Average"},
		{"id": "3", "text": "Average"},
		{"id": "4", "text": "Above Average"},
		{"id": "5", "text": "Strong"}
	]
},
{
	"id": "2",
	"text": "Rate your understanding of the article",
	"options": [		
		{"id": "1", "text": "Little"},
		{"id": "2", "text": "Below Average"},
		{"id": "3", "text": "Average"},
		{"id": "4", "text": "Above Average"},
		{"id": "5", "text": "Complete"}
	]
},
{
	"id": "3",
	"text": "Rate your prior interest in article's subject",
	"options": [		
		{"id": "1", "text": "Low"},
		{"id": "2", "text": "Below Average"},
		{"id": "3", "text": "Average"},
		{"id": "4", "text": "Above Average"},
		{"id": "5", "text": "High"}
	]
},
{
	"id": "4",
	"text": "Were you distracted or interrupted during your reading session?",
	"options": [		
		{"id": "1", "text": "Yes"},
		{"id": "2", "text": "No"},
		{"id": "3", "text": "Unsure"},
	]
}
]


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

const version = "v0.5.0"

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

function parse_body_npr(result) {
	console.log("parse_body_npr")
	var body = result
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	// const headers = $('h1')
	const title = $(".story-title")
	console.log(title.text())
	var sections = [title.text()]; 
	// console.log('headers.length')
	// console.log(headers.length)
	// while(i < headers.length){
	// 	var o = 0
	// 	while(o < headers[i].children.length){
	// 		if(headers[i].children[o].type == 'text'){
	// 			console.log('hhh')
	// 			sections.push(bodies[i].children[o].data.replace('\\n',''))
	// 		}
	// 		o ++;
	// 	}
	// 	i ++;
	// }


	i = 2
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
	return sections;
}

// function parse_body(result) {
// 	var body = result.content
// 	const $ = cheerio.load(body);
// 	const bodies = $('p');
// 	var i = 0;
// 	var sections = []; 
// 	const title = result.title
// 	sections.push(title)
// 	while(i < bodies.length){
// 		var o = 0;
// 		var subsections = [];
// 		//console.log(bodies[i].children.length)
// 		while(o < bodies[i].children.length){
// 			if(bodies[i].children[o].type == 'text'){
// 				subsections.push(bodies[i].children[o].data.replace('\\n',''));
// 				//console.log(bodies[i].children[o].data)
// 			}
// 			else if(bodies[i].children[o].type == 'tag' && bodies[i].children[o].children.length > 0 && bodies[i].children[o].children[0].data){
// 				//console.log(bodies[i].children[o].children[0])
// 				subsections.push(bodies[i].children[o].children[0].data.replace('\\n',''));
				
// 			}
// 			o ++;
// 		}	
// 		//console.log(subsections);
// 		//console.log(subsections.join(''));
// 		//console.log('------------------------')
// 		sections.push(subsections.join(''));
// 		i ++;
// 	}
// 	//console.log(title);
// 	return sections;
// }

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
	return content
}

function scrape_top_npr(callback) {
	request.get({ url: "https://text.npr.org" }, 
	function(err, response, body) {
		if(err) throw err;
	 	const $ = cheerio.load(body);
		const bodies = $('ul');
		const li = bodies[0].children
		var i = 0
		var r = []
		while(i < li.length){
			const link = li[i]
			r.push({"url": link.children[0].attribs.href})
			// console.log(link.children[0].attribs.href)
			i = i+1
		}
		//console.log(r)
	 	r.map(function(data){
	 		add_article_npr(data, function(result){
	 			return result
	 		})
	 	})
	 	callback(r)
	})
}

function promise_add_article_npr(data) {
	return new Promise((resolve, reject) => {
		console.log("add article npr")
		data.address = data.url
		data.article_link = data.address
		console.log(data.address)
		MongoClient.connect(url, function(e, db) {
			if(e) throw e;
			var dbd = db.db(database)
			dbd.collection(combined_articles_collection).findOne({'article_link': data.address}, function(err, result){
				if(err) throw(err);
				if(!result){
					//console.log('new article scrape')
					//console.log(data)
					request.get({ url: data.address }, function(er, response, body) {
						data.text = parse_body_npr(body)
						//console.log(data.text)
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
							console.log(resu.title)
							resolve(resu)
						})
					})
				}else{
					//console.log(result)
					db.close()
					resolve(result)
				}
			})
		})	
	})
	
}


async function add_article_npr(data, callback) {
	console.log("add article npr")
	data.address = data.url
	data.article_link = data.address
	console.log(data.address)
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		dbd.collection(combined_articles_collection).findOne({'article_link': data.address}, function(err, result){
			if(err) throw(err);
			if(!result){
				request.get({ url: data.address }, function(er, response, body) {
					data.text = parse_body_npr(body)
					data.content = parse_lines(data.text)
					data.title = data.text[0]
					data.version = version
					data.line_count = data.content.length

					dbd.collection(combined_articles_collection).insertOne(data, function(e, resu){ if (e) throw e; 
						db.close()
						callback(resu)
					})
				})
			}else{
				db.close()
				callback(result)
			}
		})
	})	
}


function init_session(data, res) {
	// console.log(data)
	var address = data.article_link
	if(!address.includes("text.npr")){
		console.log('isnt text.npr, this should be fun lol')
	}
	//address = address.split('.html')[0] + '.html'
	data.url = address
	add_article_npr(data,function(result){
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
				toReturn.questions = standard_questions
				//console.log(result.sessionID)
				res.send(toReturn);
			});
		})
	})
}

app.get('/npr_scrape_all', function(req, res){
	scrape_top_npr(function(tops){
		console.log("tops")
		//console.log(tops[0].title)
		console.log(tops)
		res.send(tops)
	})
});

app.get('/npr_scrape_one', function(req, res){
	var data = req.body
	add_article_npr(data, function(result){
		// console.log(result)
		res.send(result)
	})
});

app.get('/articles', function(req, res){
	var data = req.get("X-UDID")
	data = data.replace(/-/g, '_');
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		dbd.collection(combined_articles_collection).find({}).sort({_id: -1}).toArray(async function(er, results) {
			if(er) throw er;
			var new_data = []
			var i = 0
			while(i < results.length){
				session = await dbd.collection(combined_sessions_collection).findOne({'article_id': ObjectId(results[i]._id),'UDID': data, 'completed': true})
				if(!session){
					new_data.push(results[i])
				}
				i = i + 1
			}
			res.send(new_data)
			db.close()
			
				
			
		})
	})
})


// app.get('/identities', function(req,res){
// 	res.send([{"udid":"0B70C724_6597_4659_9322_E113E9403601","device":"iPhone9,1"}
// 		,{"udid":"35F7C004_7F5D_4C77_8E84_313FD79C77E0","device":"iPad6,11"}
// 		,{"udid":"828296DD_6B30_43B8_8986_8E12A13CD9F2","device":"iPhone9,1"}
// 		,{"udid":"8CE7904A_11BC_4E65_A236_00BAC8F51F6B","device":"iPhone9,3"}
// 		,{"udid":"93D9D52B_04D9_4532_A24B_D90B845A062E","device":"iPhone10,3"}
// 		,{"udid":"A48F157C_4768_44C9_86BF_6978C67BB756","device":"iPad7,3"}
// 		,{"udid":"ACE7A1BC_AB49_42A6_B276_2A0852E0B9EE","device":"iPhone8,1"}]
// 	)
// })

async function sessions_article_helper(dbd,result){
	article_data = await dbd.collection(combined_articles_collection).findOne({'_id': ObjectId(result.article_id)})
	//console.log(article_data)
	//console.log(result.article_id)
	result.article_title = article_data.title
	result.article_data = article_data
	//console.log(article_data.text)
	return result
}

async function sessions_helper(dbd, results){
	return Promise.all(results.map(result => sessions_article_helper(dbd,result)))
}


app.get('/sessions', function(req,res){
	var data = req.body
	//data.UDID = data.UDID.replace(/-/g, '_');
	//console.log(data)

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database) //'UDID': data.UDID, 
		dbd.collection(combined_sessions_collection).find({"article_id": ObjectID('60454fe5906d053c3fa1a568')}).sort({_id: -1}).toArray(async function(err, results) {
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

				res.send(data)
				//res.send(new_data)
				db.close()
			})
		})
	})
})

app.get('/sessions_UDID', function(req,res){
	var data = req.body
	//data.UDID = data.UDID.replace(/-/g, '_');
	//console.log(data)

	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database) //'UDID': data.UDID, 
		dbd.collection(combined_sessions_collection).find({"completed": true}).sort({_id: -1}).toArray(async function(err, results) {
			if (err) throw err;
			//console.log(results)

			sessions_helper(dbd,results).then(data => {
				var tempi = 0
				udid_dict = {}
				article_dict = {}
				while(tempi < results.length){
					i = data[tempi]
					if(i["article_id"] in article_dict){
						article_dict[i["article_id"]] += 1
					}
					else{
						article_dict[i["article_id"]] = 1
					}
					if(i["UDID"] in udid_dict){
						udid_dict[i["UDID"]] += 1
					}
					else{
						udid_dict[i["UDID"]] = 1
					}
					tempi = tempi + 1
				}

				console.log(udid_dict)
				console.log(article_dict)
				console.log("---dict")
				res.send(data)
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
	var type = req.get("X-DEVICE-TYPE")
	toReturn.showReplays = type.includes("x86")

	toReturn.showIntro = true
	res.send(toReturn)
})

app.post('/submit_email', function(req,res){
	var data = req.body
	console.log('submit_email')
	console.log(data)
	var udid = req.get("X-UDID")
	udid = udid.replace(/-/g, '_');
	data.UDID = udid

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(database) 
		if (err) throw err;
  		dbd.collection(emails_collection).insertOne(data, function(e, resu){ if (e) {throw e;} else {res.send({"success": true})} });
  		db.close();
	});
})

app.post('/submit_answers', function(req,res){
	var data = req.body
	console.log('submit_answers')
	console.log(data)

	// if(data.article){
	// 	data.article = data.article.split('.html')[0] + '.html'
	// }
	// data.UDID = data.UDID.replace(/-/g, '_');
	// console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(questions_db) 
		if (err) throw err;
		// var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.session_id).insertOne(data, function(e, resu){ if (e) {throw e;} else {res.send({"success": true})} });
  		db.close();
	});
})

app.post('/get_survey', function(req, res){
	var data = req.body
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(questions_db) 
		if (err) throw err;
		// var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.session_id).find({}).toArray(async function(e, resu){ if (e) {throw e;} else {res.send(resu)} });
  		db.close();
	});
})

app.post('/get_event', function(req, res){
	var data = req.body
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(events_db) 
		if (err) throw err;
		//var s = data.startTime.toString().split('.')[0]
		// //console.log(data.UDID + s)
  		dbd.collection(data.session_id).find({}).toArray(async function(e, resu){ if (e) {throw e;} else {res.send(resu)} });
  		db.close();
	});
})

app.post('/session_replay', function(req,res){
	console.log('session_replay')
	//in this context article link actual means session id

	//console.log(data)
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var data = req.body
		data.UDID = data.UDID.replace(/-/g, '_');
		//console.log(data)
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
		    	dbsession.collection(data.article_link).find({}).toArray(function(errr, col){
		    		if (errr) throw errr;
		    		i = 0
		    		
		    		c = result.content
		    		
	    			result.session_data = col
	    			result.max_lines = maxLines
	    			
					res.send(result)
					db.close();
		    	})
		    })
		})
	})
})


app.post("/open_article", function(req, res) {
	//console.log('open article')
	var data = req.body

	//data.article_link = data.article_link.split('.html')[0] + '.html'
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
	// if(data.article){
	// 	data.article = data.article.split('.html')[0] + '.html'
	// }
	data.UDID = data.UDID.replace(/-/g, '_');
	// console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
		// var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.session_id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});


app.post("/submit_data_batched", function(req, res) {
	var data = req.body
	console.log('submit data batched')
	//article link and UDID stuffs
	// if(data.article){
	// 	data.article = data.article.split('.html')[0] + '.html'
	// }
	data.UDID = data.UDID.replace(/-/g, '_');
	//console.log(data.data)
	//console.log(data.session_id)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
		// var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.session_id).insertMany(data.data, function(e, ress){ 
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
	console.log(data)
	console.log("---")
	//article link and UDID stuffs
	// if(data.article){
	// 	data.article = data.article.split('.html')[0] + '.html'
	// }
	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(events_db) 
		if (err) throw err;

		//var s = data.startTime.toString().split('.')[0]
		//console.log(data.UDID + s)
  		dbd.collection(data.session_id).insertOne(data, function(e, res){ if (e) throw e; });
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
			db.close()
		});
	});

	res.sendStatus(200)
});







var server = app.listen(22364, function () {
    console.log("Listening on port %s...", server.address().port);
});











