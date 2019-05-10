import pymongo
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import decimal
import sys
import re
import os 
import datetime

now = datetime.datetime.now()
path = str(now.month) + '-' + str(now.day) + '-' + str(now.hour) + '-' + str(now.minute)

#make it points instead of lines on graph
#need to order by time when making these db calls

#by work length and sentence length, take a look at young mikes stuff
#by word frequency

#tfidf 
#overlay onto time vs speed

#                Data to be collected per section
# (1-3) number of phrases
# (4-6) number of total words
# (7-9) words per phrase (2/1)
# (10-12) number of non-function words
# (13-15) non-function words per phrase (4/1)
# (16-18) mean of total words
# (19-21) std. dev. of total words
# (22-24) mean of non-function words
# (25-27) std. dev. of non-function words
# (28-30) mean of ln(word frequency) (total words)
# (31-33) std. dev. of ln(word frequency) (total words)
# (34-36) mean of ln(word frequency) (non-function words)
# (37-39) std. dev. of ln(word frequency) (non-function words)
# (40) constant term = 1
# (41) scroll time for the current page based on a gamma dist.
#--------------------------------------------------------------

# function_word_list = []
# with open("../../word_classification/text_files/function_word_list.txt", mode="r") as READ_FILE:
#     for _ in READ_FILE:
#         _ = re.sub("\n", "", _)
#         function_word_list.append(_)
# READ_FILE.close()


def float_to_str(f): #https://stackoverflow.com/questions/38847690/convert-float-to-string-without-scientific-notation-and-false-precision
	ctx = decimal.Context()
	ctx.prec = 20
	d1 = ctx.create_decimal(repr(f))
	return format(d1, "f")

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions"]
sort_param = [("appeared", pymongo.ASCENDING), ("_id", pymongo.ASCENDING)]
data = myclient["data"]
global max_lines_on_screen
max_lines_on_screen = 0


acceptable_versions = ["v0.3.1", "v0.2.7"] # 100000000
time_offset = 100000000

#returns article data given the id in the mongo db
def getArticle(id):
	mycol = data["articles"]
	article = mycol.find_one({"_id": id})
	return article

#basic tool to pretty print session collections
def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)

#find all completed sessions in the acceptable versions
def findSessions(acceptable, incl_incomplete):
	mycol = data["sessions"]
	completed = []
	for x in mycol.find():
		if( (x["completed"] or not incl_incomplete) and x["type"] != "x86_64" ): #and x["version"] in acceptable_versions):
			x["article_data"] = getArticle(x["article_id"])
			completed.append(x)
	return completed

def make_title(data):
	return ("Start Time:" + str(data["startTime"]/time_offset) + " -  UDID:" + data["UDID"] + " -  Article Link:" + data["article_data"]["article_link"] + " - version:" +  data["version"])

def smoothed_helper(data, cell_string):
	mycol = sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]]
	times = [0]*(len(data["content"])+1)
	prev = 0
	for row in mycol.find().sort(sort_param):
		if(prev == 0):
			prev = data["startTime"]
		else:
			for i in range(min(int(row[cell_string]), int(row["previous_" + cell_string])), max(int(row[cell_string]), int(row["previous_" + cell_string]))):
				times[i] += ((row["appeared"] - prev)/time_offset)/abs(int(row[cell_string]) - int(row["previous_" + cell_string]))
		prev = row["appeared"]
	for t in times:
		if(t < 0):
			print(data)
			print('tried to smooth but got negative')
			break
	ind = np.arange(len(times))
	plt.bar(ind, times, 0.3)

def smoothed_timeAsFirstCell(data):
	plt.ylabel("# seconds spent as First Cell")
	plt.xlabel("cells on device")
	plt.suptitle(make_title(data))
	smoothed_helper(data, "first_cell")
	plt.savefig(path + '/' +str(data["startTime"]/time_offset) +"smoothed_timeAsFirstCell.pdf", bbox_inches="tight")
	plt.clf()

def smoothed_timeAsLastCell(data):
	plt.ylabel("# seconds spent as Last Cell")
	plt.xlabel("cells on device")
	plt.suptitle(make_title(data))
	smoothed_helper(data, "last_cell")
	plt.savefig(path + '/' + str(data["startTime"]/time_offset) +"smoothed_timeAsLastCell.pdf", bbox_inches="tight")
	plt.clf()

def timeOnScreen_helper(data):
	mycol = sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]]
	times = [0]*len(data["content"]) 
	prev = data["startTime"]
	for row in mycol.find().sort( sort_param ):
		for i in range(int(row["first_cell"]), int(row["last_cell"])):
			times[i] += (row["appeared"] - prev)/time_offset
		prev = row["appeared"]
	return times

def timeOnScreen(data):
	plt.ylabel("# seconds spent on screen")
	plt.xlabel("cell # in article")
	plt.suptitle(make_title(data))
	times = timeOnScreen_helper(data)
	ind = np.arange(len(times))
	plt.bar(ind, times, 0.3)
	plt.savefig(path + '/' +str(data["startTime"]/time_offset) +"timeOnScreen.pdf", bbox_inches="tight")
	plt.clf()
	return times

def timeVersusProgress_helper(data, cell_string):
	mycol = sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]]
	times = []
	lines = []
	for row in mycol.find().sort(sort_param):
		times.append((row["appeared"] - data["startTime"])/time_offset)
		lines.append(int(row[cell_string]))
	return (times, lines)

def timeVersusFirstCell(data):
	plt.ylabel("First cell # on users screen")
	plt.xlabel("seconds since start of reading session")
	plt.suptitle(make_title(data))
	(times, lines) = timeVersusProgress_helper(data, "first_cell")
	plt.plot(time, lines)
	plt.savefig(path + '/' +str(data["startTime"]/time_offset) + "timeVersusFirstCell.pdf", bbox_inches="tight")
	plt.clf()

def timeVersusLastCell(data):
	plt.ylabel("Last cell # on users screen")
	plt.xlabel("seconds since start of reading session")
	plt.suptitle(make_title(data))
	plt.plot(timeVersusProgress_helper(data, "last_cell"))
	plt.savefig(path + '/' +str(data["startTime"]/time_offset) + "timeVersusLastCell.pdf", bbox_inches="tight")
	plt.clf()

def timeVersusSpeed_helper(data): #this version does not device by time, but multiplies by rows scrolled
	mycol = sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]]
	t = -1
	rates = []
	rate = 0
	for row in mycol.find().sort(sort_param):
		if(t == -1):
			t = row["appeared"]/time_offset
		
		if(t+1 > row["appeared"]/time_offset):	
			rate += 1
		else:
			rates.append(rate)
			t += 1
			rate = 0
	plt.plot(rates)
	return rates

def timeVersusSpeed(data):
	plt.ylabel("# of lines scrolled per second")
	plt.xlabel("seconds since start of reading session")
	plt.suptitle(make_title(data))
	timeVersusSpeed_helper(data)
	# (times, lines) = timeVersusProgress_helper(data, "first_cell")
	# rates = []
	# for i in np.diff(times):
	# 	rates.append(1/i)
	# plt.plot(rates)

	plt.savefig(path + '/' +str(data["startTime"]/time_offset) + "timeVersusSpeed.pdf", bbox_inches="tight")
	plt.clf()


def analyse_text(session_data, func):
	x = session_data
	plt.ylabel("# seconds spent on screen")
	plt.xlabel("words per paragraph")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	times = new_arg_func_helper(session_data)
	plt.savefig(path + '/' +str(x["startTime"]/time_offset) +"timeOnScreenPerParagraph.pdf", bbox_inches="tight")
	plt.clf()
	#print(session_data["content"])

def clean_text(file_text):
	file_text = file_text.lower()
	file_text = re.sub("mr\.", "mr", file_text)
	file_text = re.sub("mrs\.", "mrs", file_text)
	file_text = re.sub("dr\.", "dr", file_text)
	file_text = re.sub("sr\.", "sr", file_text)
	file_text = re.sub(",", "", file_text)
	file_text = re.sub("\'", "", file_text)
	file_text = re.sub("-", "", file_text)
	file_text = re.sub("\"", "", file_text)
	file_text = re.sub("\s+", " ", file_text)
	return file_text

def analyse_text_helper(session_data):
	t = timeOnScreen(session_data)
	tmax = 0.0
	total = 0.0
	c = 0
	num_words = 0
	phrases = 0

	times = []
	words = []
	p = []
	for i in range(0, len(session_data["content"])):
		if(not session_data["content"][i]["spacer"]):
			if(t[i] > tmax):
				tmax = t[i]
			total += t[i]
			c += 1
			ctext = clean_text(session_data["content"][i]["text"])
			num_words += len(ctext.split())
			for word in ctext.split():
				if("." in word or ";" in word or ":" in word or "?" in word or "!" in word):
					phrases += 1
		else:
			times.append(tmax)
			words.append(num_words)
			p.append((tmax, num_words, total/c, phrases))
			tmax = 0.0
			total = 0.0
			c = 0
			num_words = 0
			phrases = 0
	plt.plot(p)




def old_arg_func(ses):
	if(sys.argv[2] == "n"):
		print(len(ses))
	elif(sys.argv[2] == "d"):
		for i in ses:
			print(str(i["_id"]) + " - " + str(i["article_data"]["article_link"]) + " - " + str(i["UDID"]))
	elif(sys.argv[2] == "udid"):
		count = {}
		for i in ses:
			if(str(i["UDID"]) in count):
				count[str(i["UDID"])] += 1
			else:
				count[str(i["UDID"])] = 1
		print(count)
	elif(sys.argv[2] == "article"):
		count = {}
		for i in ses:
			if(str(i["article_data"]["article_link"]) in count):
				count[str(i["article_data"]["article_link"])] += 1
			else:
				count[str(i["article_data"]["article_link"])] = 1
		print(count)
	elif(sys.argv[2] == "version"):
		count = {}
		for i in ses:
			if(str(i["version"]) in count):
				count[str(i["version"])] += 1
			else:
				count[str(i["version"])] = 1
		print(count)
	elif(sys.argv[2] == "graph"):
		num = int(sys.argv[3])

		timeVersusLastCell(x)
		timeVersusFirstCell(x)
		timeOnScreen(x)
		smoothed_timeAsFirstCell(x)
		smoothed_timeAsLastCell(x)
	elif(sys.argv[2] == "graphby"):
		if(sys.argv[3] == "article"):
			for x in ses:
				if(x["article_data"]["article_link"] == sys.argv[4]):
					timeVersusLastCell(x)
					timeVersusFirstCell(x)
					timeOnScreen(x)
					smoothed_timeAsFirstCell(x)
					smoothed_timeAsLastCell(x)
	elif(sys.argv[2] == "all"):
		try:  
		    os.mkdir(path)
		except OSError:  
		    print ("Creation of the directory %s failed" % path)
		else:  
		    print ("Successfully created the directory %s " % path)
		for x in ses:
			try:
				timeOnScreen(x)
			except Exception as e:
				print("uhoh1")
				print(e)
				pass
			try:
				smoothed_timeAsFirstCell(x)
			except Exception as e:
				print("uhoh2")
				print(e)
			try:
				smoothed_timeAsLastCell(x)
			except Exception as e:
				print("uhoh3")
				print(e)
				pass
			try:
				timeVersusSpeed(x)
			except Exception as e:
				print("uhoh4")
				print(e)
				pass

def timePerArticleVWords(x):
	time = x["endTime"] - x["startTime"]
	phrases = 0
	words = 0
	for line in x["article_data"]["text"]:
		words += len(line.split()) 
		l = clean_text(line)
		for word in l.split():
			if ("." in word or ";" in word or ":" in word or "?" in word or "!" in word):
				phrases += 1
	return (time, words, phrases)


if(sys.argv[1] == "c" ):
	ses = findSessions(acceptable_versions, True)
	old_arg_func(ses)
elif(sys.argv[1] == "n"):
	ses = findSessions(acceptable_versions, False)
	old_arg_func(ses)
else:
	ses = findSessions(acceptable_versions, True)
	a = []
	times = []
	words = []
	for x in ses:
		#if(x["UDID"] == "828296DD_6B30_43B8_8986_8E12A13CD9F2"):
		(t, s, phrases) = timePerArticleVWords(x)
		times.append(t)
		words.append(s)
		a.append((t/time_offset,s,phrases))
	plt.plot(a)
	plt.savefig("828296DD_6B30_43B8_8986_8E12A13CD9F2timePerArticleVWords.pdf", bbox_inches="tight")
	#analyse_text(ses[len(ses)-2 ], "num_words")

# print(len(comp))
# x = comp[len(comp)-2]
# #y = comp[len(comp)-4]

# #print(y["article_data"]["article_link"])
# print(x["article_data"]["article_link"])
# f = plt.figure()

# timeVersusProgress(x, plt)

# #plt.plot(timeAsFirstCell(y))
# #timeVersusProgress(x, plt)

# f.savefig("foo.pdf", bbox_inches="tight")
# #plt.plot(timeAsFirstCell(y))

#print(max_lines_on_screen)
#print(findcompletedsessions())
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16
