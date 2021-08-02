/*
Arman Aydemir


db overview:
	main database:
		- articles collection
			- all article data
		- emails collection 
			- UDID, email
		- sessions collection
			- basic session data
	events database: (collection for each session_id)
		- events which occured during session (if any exist)
	sessions database: (collection for each session_id)
		- actual reading session data (from submit_data_batched)
	questions database: (collection for each session_id)
		- responses to survey for that reading session
*/


var express = require("express");
var bodyParser = require("body-parser");
const cheerio = require('cheerio')
var app = express();
var request = require('request');

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = "mongodb://localhost:27017/";

// VERY VERY IMPORTANT
var database = 'data_official'
var sessions_db = 'sessions_official'
var events_db = 'events_official'
var questions_db = 'questions_official'
const version = "v0.5.0"

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


console.log('started at least')

spaceLabelHeightRatio = 0.25
maxLines = 20
maxChars = 55


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var headers = {
    'x-api-key': 'F38xVZRhInLJvodLQdS1GDbyBroIScfRgGAbzhVY'
};

//retrieves text from npr html
function parse_body_npr(result) {
	console.log("parse_body_npr")
	var body = result
	const $ = cheerio.load(body);
	const bodies = $('p');
	var i = 0;
	const title = $(".story-title")
	var sections = [title.text()]; 

	i = 2
	while(i < bodies.length){
		var o = 0;
		var subsections = [];
		//console.log(bodies[i].children.length)
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
	return sections;
}

//splits out content into lines of 30 characters or less
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


//adds article to combined articles collection in main DB if it doesnt exist
//calls parse lines and parse body npr
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


//called when a reading session is initialized (/open_article)
//initializes reading session in sessions collection in main DB
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

//add one npr article
// calls add_article_npr
app.get('/npr_scrape_one', function(req, res){
	var data = req.body
	add_article_npr(data, function(result){
		// console.log(result)
		res.send(result)
	})
});

//returns list of articles which user has not completed
app.get('/articles', function(req, res){
	var data = req.get("X-UDID")
	//clean udid
	data = data.replace(/-/g, '_');
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var dbd = db.db(database)
		//retrieve all articles
		dbd.collection(combined_articles_collection).find({}).sort({_id: -1}).toArray(async function(er, results) {
			if(er) throw er;
			var new_data = []
			var i = 0
			while(i < results.length){
				//only send those which have not been completed
				session = await dbd.collection(combined_sessions_collection).findOne({'article_id': ObjectId(results[i]._id),'UDID': data, 'completed': true})
				if(!session){
					to_add = results[i]
					to_add.line_count = " "
					new_data.push(to_add)
				}
				i = i + 1
			}
			res.send(new_data)
			db.close()	
		})
	})
})

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

//returns all completed sessions for sessions view
app.get('/sessions', function(req,res){
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

//returns basic stats about how many sessions each user has completed
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
	//toReturn.showReplays = type.includes("x86")
	toReturn.introHTML = introHTML
	toReturn.showIntro = true
	res.send(toReturn)
})

//called when a user submits their email after accepting terms on initial splash screen
//adds their email and udid to emails_collection in main database
app.post('/submit_email', function(req,res){
	var data = req.body
	console.log('submit_email')
	console.log(data)

	//cleaning udid
	var udid = req.get("X-UDID")
	udid = udid.replace(/-/g, '_');
	data.UDID = udid

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(database) 
		if (err) throw err;
		//adding their email and udid to user list
  		dbd.collection(emails_collection).insertOne(data, function(e, resu){ if (e) {throw e;} else {res.send({"success": true})} });
  		db.close();
	});
})

//called when a user submits responses to survey after reading an article
//adds their responses to session's collection in questions_db
app.post('/submit_answers', function(req,res){
	var data = req.body

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(questions_db) 
		if (err) throw err;
  		dbd.collection(data.session_id).insertOne(data, function(e, resu){ if (e) {throw e;} else {res.send({"success": true})} });
  		db.close();
	});
})

//returns session data in proper format for replaying
app.post('/session_replay', function(req,res){
	// console.log('session_replay')
	MongoClient.connect(url, function(e, db) {
		if(e) throw e;
		var data = req.body
		var dbd = db.db(database)
		var dbsession = db.db(sessions_db)

		//cleaning udid
		data.UDID = data.UDID.replace(/-/g, '_');

		//find session  //in this context article link actually means session id
		dbd.collection(combined_sessions_collection).findOne({'_id': ObjectId(data.article_link)}, function(err, result) {
		    if (err) throw err;

		    //collect article data
		    dbd.collection(combined_articles_collection).findOne({'_id': ObjectId(result.article_id)},function(er, article){
		    	if (er) throw er;
		    	result.article_data = article
		    	result.paragraphs = article.text

		    	//collect sessions data
		    	dbsession.collection(data.article_link).find({}).toArray(function(errr, col){
		    		if (errr) throw errr;	
	    			result.session_data = col
	    			result.max_lines = maxLines

	    			//send results
					res.send(result)
					db.close();
		    	})
		    })
		})
	})
})

//called when user selects an article to begin a reading sessions
//calls init_session
app.post("/open_article", function(req, res) {
	//console.log('open article')
	var data = req.body
	//clean udid
	data.UDID = data.UDID.replace(/-/g, '_');
    init_session(data, res);
});

//old function to submit one update for sessions, only batched version should be used now
app.post("/submit_data", function(req, res) {
	var data = req.body
	//clean udid
	data.UDID = data.UDID.replace(/-/g, '_');
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
  		dbd.collection(data.session_id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});

// called when submitting data during reading session
// adds data to session's collection in the session DB
app.post("/submit_data_batched", function(req, res) {
	var data = req.body
	// console.log('submit data batched')
	// clean udid
	data.UDID = data.UDID.replace(/-/g, '_');
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(sessions_db) 
		if (err) throw err;
  		dbd.collection(data.session_id).insertMany(data.data, function(e, ress){ 
  			if (e) throw e; 
  			toReturn = {}
  			res.send(toReturn)
  		});
  		db.close();
	});
});

// called when an event occurs during reading session
// adds event to session's collection in event DB
app.post("/submit_event", function(req, res) {
	var data = req.body
	// console.log('submit event')
	// console.log(data)
	// console.log("---")

	data.UDID = data.UDID.replace(/-/g, '_');
	console.log(data.UDID)
	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(events_db) 
		if (err) throw err;
  		dbd.collection(data.session_id).insertOne(data, function(e, res){ if (e) throw e; });
  		db.close();
	});

	res.sendStatus(200)
});

//called when user hits 'completed reading' button
//marks session as complete in combined sessions collection in main DB
app.post("/close_article", function(req,res){
	var data = req.body

	MongoClient.connect(url, function(err, db) {
		var dbd = db.db(database)
		if (err) throw err; 
		var s = new ObjectId(data.session_id)
		var q = {'_id': s}
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


introHTML = `
<h2><strong><em><img src="https://www.colorado.edu/brand/sites/default/files/page/boulder-fl-master-2_0.png" alt="" width="429" height="87" /><br /></em></strong></h2>
<h2>&nbsp;</h2>
<h2><strong><em>Title of research study: </em></strong><span style="font-weight: 400;">Operationalizing Students&rsquo; Textbook Annotations</span></h2>
<h2><strong><em>Investigator: </em></strong><span style="font-weight: 400;">Arman Aydemir</span></h2>
<h2><strong><em>Why am I being invited to take part in a research study?</em></strong></h2>
<p><span style="font-weight: 400;">We invite you to take part in a research study because you are at least 18 years old, have normal vision or wear corrective lenses, are a fluent English speaker and have not previously participated in the experiment.</span></p>
<h2><strong><em>What should I know about a research study?</em></strong></h2>
<ul>
<li style="font-weight: 400;"><span style="font-weight: 400;">This research study will be explained to you.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">Whether or not you take part is up to you.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You can choose not to take part.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You can agree to take part and later change your mind.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">Your decision will not be held against you.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You can ask all the questions you want before you decide.</span></li>
</ul>
<h2><strong><em>Who can I talk to?</em></strong></h2>
<p><span style="font-weight: 400;">If you have questions, concerns, or complaints, or think the research has hurt you, talk to the research team by emailing Arman Aydemir at arman.aydemir@colorado.edu.</span></p>
<p><span style="font-weight: 400;">This research has been reviewed and approved by an Institutional Review Board (&ldquo;IRB&rdquo;). You may talk to them at (303) 735-3702 or </span><strong>irbadmin@colorado.edu</strong><span style="font-weight: 400;"> if:</span></p>
<ul>
<li style="font-weight: 400;"><span style="font-weight: 400;">Your questions, concerns, or complaints are not being answered by the research team.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You cannot reach the research team.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You want to talk to someone besides the research team.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You have questions about your rights as a research subject.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">You want to get information or provide input about this research.</span></li>
</ul>
<h2><strong><em>Why is this research being done?</em></strong></h2>
<p><span style="font-weight: 400;">The purpose of this research is to understand the relationship between the understanding of a presented text and the subject&rsquo;s annotations of and interactions with the text. </span><span style="font-weight: 400;">By conducting a series of such experiments, we hope to enhance online textbooks so as to facilitate students&rsquo; long-term understanding and retention of textbook content.</span></p>
<p>&nbsp;</p>
<h2><strong><em>How long will the research last?</em></strong></h2>
<p><span style="font-weight: 400;">We expect that this research study will last for up to 3 months.</span></p>
<h2><strong><em>How many people will be studied?</em></strong></h2>
<p><span style="font-weight: 400;">We expect 45 people will be in this research study.</span></p>
<h2><strong><em>What happens if I say yes, I want to be in this research?</em></strong></h2>
<ul>
<li style="font-weight: 400;"><span style="font-weight: 400;">You will be using your own portable device to complete the study at a time of your choosing.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">This app will allow you to read articles from a news source or science magazine or biology textbook. The app will also allow you to take a short survey on material you have previously read.&nbsp;</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">When and how much you use this app, and when and whether you take quizzes will be up to you.</span></li>
<li style="font-weight: 400;"><span style="font-weight: 400;">We will record your screen interactions and annotations along with your email address. No other personal data will be requested.</span></li>
</ul>
<h2><strong><em>What happens if I do not want to be in this research?</em></strong></h2>
<p><span style="font-weight: 400;">You can leave the research at any time and it will not be held against you.</span></p>
<h2><strong><em>What happens if I say yes, but I change my mind later?</em></strong></h2>
<p><span style="font-weight: 400;">You can leave the research at any time and it will not be held against you. If you choose to leave during the experiment, any data collected will be permanently deleted.</span></p>
<h2><strong><em>What happens to the information collected for the research?</em></strong></h2>
<p><span style="font-weight: 400;">Efforts will be made to limit the use and disclosure of behavioral data collected during this research study to people who have a need to review this information. We cannot promise complete secrecy. Organizations that may inspect and copy your information include the IRB and other representatives of this organization. In addition, representatives of University of Colorado Boulder and the National Science Foundation may inspect and copy this information.</span></p>
<p><span style="font-weight: 400;">All data collected will be stored on a secure server indefinitely and will only be accessible by the research team.</span></p>
<h2><strong><em>Can I be removed from the research without my OK?</em></strong></h2>
<p><span style="font-weight: 400;">The person in charge of the research study or the sponsor can remove you from the research study without your approval. Possible reasons for removal include the inability to follow study procedures.</span></p>
<h2><strong><em>What else do I need to know?</em></strong></h2>
<p><span style="font-weight: 400;">If you agree to take part in this research study, we will offer you a $40 Amazon gift card following completion of the study.&nbsp;</span></p>
<p><span style="font-weight: 400;">If you wish to learn more about the results of this research you can contact Arman Aydemir arman.aydemir@colorado.edu.</span></p>
<p><br /><br /></p>
`;












