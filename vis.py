import pymongo
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import decimal
import sys



def float_to_str(f): #https://stackoverflow.com/questions/38847690/convert-float-to-string-without-scientific-notation-and-false-precision
	ctx = decimal.Context()
	ctx.prec = 20
	d1 = ctx.create_decimal(repr(f))
	return format(d1, 'f')

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions"]
data = myclient["data"]
global max_lines_on_screen
max_lines_on_screen = 0


acceptable_versions = ['v0.3.1'] # 100000000
time_offset = 100000000

#returns article data given the id in the mongo db
def getArticle(id):
	mycol = data["articles"]
	article = mycol.find_one({'_id': id})
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
		if(x["version"] in acceptable and (x["completed"] or not incl_incomplete) and x["type"] != "x86_64"):
			x["article_data"] = getArticle(x["article_id"])
			completed.append(x)
	return completed

def smoothed_helper(data, cell_string):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	times = [0]*(len(data["content"])+1)
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = data["startTime"]
		else:
			for i in range(min(int(row[cell_string]), int(row["previous_" + cell_string])), max(int(row[cell_string]), int(row["previous_" + cell_string]))):
				times[i] += ((row["appeared"] - prev)/time_offset)/abs(int(row[cell_string]) - int(row["previous_" + cell_string]))
		prev = row["appeared"]
	plt.plot(times)

def smoothed_timeAsFirstCell(data):
	plt.ylabel("# seconds spent as First Cell")
	plt.xlabel("cells on device")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	smoothed_helper(data, "first_cell")
	plt.savefig(str(x["startTime"]/time_offset) +"smoothed_timeAsFirstCell.pdf", bbox_inches='tight')
	plt.clf()

def smoothed_timeAsLastCell(data):
	plt.ylabel("# seconds spent as Last Cell")
	plt.xlabel("cells on device")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	smoothed_helper(data, "last_cell")
	plt.savefig(str(x["startTime"]/time_offset) +"smoothed_timeAsLastCell.pdf", bbox_inches='tight')
	plt.clf()

def timeOnScreen_helper(data):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	times = [0]*len(data["content"]) 
	prev = data["startTime"]
	for row in mycol.find():
		for i in range(int(row["first_cell"]), int(row["last_cell"])):
			times[i] += (row["appeared"] - prev)/time_offset
		prev = row["appeared"]
	plt.plot(times)

def timeOnScreen(data):
	plt.ylabel("# seconds spent on screen")
	plt.xlabel("cells on device")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	timeOnScreen_helper(data)
	plt.savefig(str(x["startTime"]/time_offset) +"timeOnScreen.pdf", bbox_inches='tight')
	plt.clf()

def timeVersusProgress_helper(data, cell_string):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	times = []
	lines = []
	for row in mycol.find():
		times.append((row["appeared"] - x["startTime"])/time_offset)
		lines.append(int(row[cell_string]))
	plt.plot(times,lines)

def timeVersusFirstCell(data):
	plt.ylabel("First cell # on user's screen")
	plt.xlabel("seconds since start of reading session")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	timeVersusProgress_helper(x, "first_cell")
	plt.savefig(str(x["startTime"]/time_offset) + "timeVersusFirstCell.pdf", bbox_inches='tight')
	plt.clf()

def timeVersusLastCell(data):
	plt.ylabel("Last cell # on user's screen")
	plt.xlabel("seconds since start of reading session")
	plt.suptitle(str(x["startTime"]/time_offset) + " : " + x["UDID"] + " : " + x["article_data"]["article_link"])
	timeVersusProgress_helper(x, "last_cell")
	plt.savefig(str(x["startTime"]/time_offset) + "timeVersusLastCell.pdf", bbox_inches='tight')
	plt.clf()


if(sys.argv[1] == 'c'):
	ses = findSessions(acceptable_versions, True)
else:
	ses = findSessions(acceptable_versions, False)


if(sys.argv[2] == 'n'):
	print(len(ses))
elif(sys.argv[2] == 'd'):
	for i in ses:
		print str(i["_id"]) + " - " + str(i["article_data"]["article_link"]) + " - " + str(i['UDID'])
elif(sys.argv[2] == 'udid'):
	count = {}
	for i in ses:
		if(str(i['UDID']) in count):
			count[str(i['UDID'])] += 1
		else:
			count[str(i['UDID'])] = 1
	print count
elif(sys.argv[2] == 'article'):
	count = {}
	for i in ses:
		if(str(i['article_data']["article_link"]) in count):
			count[str(i["article_data"]["article_link"])] += 1
		else:
			count[str(i["article_data"]["article_link"])] = 1
	print count
elif(sys.argv[2] == 'graph'):
	num = int(sys.argv[3])

	x = ses[len(ses)-num]
	timeVersusLastCell(x)
	timeVersusFirstCell(x)
	timeOnScreen(x)
	smoothed_timeAsFirstCell(x)
	smoothed_timeAsLastCell(x)
elif(sys.argv[2] == 'graphby'):
	if(sys.argv[3] == 'article'):
		for x in ses:
			if(i["article_data"]["article_link"] == sys.argv[4]):
				timeVersusLastCell(x)
				timeVersusFirstCell(x)
				timeOnScreen(x)
				smoothed_timeAsFirstCell(x)
				smoothed_timeAsLastCell(x)




# print(len(comp))
# x = comp[len(comp)-2]
# #y = comp[len(comp)-4]

# #print(y['article_data']['article_link'])
# print(x['article_data']['article_link'])
# f = plt.figure()

# timeVersusProgress(x, plt)

# #plt.plot(timeAsFirstCell(y))
# #timeVersusProgress(x, plt)

# f.savefig("foo.pdf", bbox_inches='tight')
# #plt.plot(timeAsFirstCell(y))

#print(max_lines_on_screen)
#print(findcompletedsessions())
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16