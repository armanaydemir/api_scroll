import pymongo
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import decimal

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


acceptable_versions = ['v0.2.5']

#returns article data given the id in the mongo db
def getArticle(id):
	mycol = data["articles"]
	article = mycol.find_one({'_id': id})
	return article

#find all completed sessions in the acceptable versions
def findCompletedSessions():
	mycol = data["sessions"]
	completed = []
	for x in mycol.find():
		if(x["version"] in acceptable_versions and x["completed"] == True):
			x["article_data"] = getArticle(x["article_id"])
			completed.append(x)
	return completed

#basic tool to pretty print session collections
def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)

def timeAsLastCell(data):
	global max_lines_on_screen
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	#print((data["line_splits"]))
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		if(int(row["last_cell"]) - int(row["first_cell"]) > max_lines_on_screen):
			max_lines_on_screen = int(row["last_cell"]) - int(row["first_cell"]) 
		times[row["last_cell"]] += (row["appeared"] - prev) * 30
	return times

def timeAsFirstCell(data):
	global max_lines_on_screen
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	#print((data["line_splits"]))
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		if(int(row["last_cell"]) - int(row["first_cell"]) > max_lines_on_screen):
			#print(row["first_cell"])
			#print(max_lines_on_screen)
			max_lines_on_screen = int(row["last_cell"]) - int(row["first_cell"]) 
		times[row["first_cell"]] += (row["appeared"] - prev) * 30
	return times

def smoothed_timeAsFirstCell(data):
	global max_lines_on_screen
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	#print((data["line_splits"]))
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		else:
			for i in range(min(int(row["first_cell"]), int(row["previous_first_cell"])), max(int(row["first_cell"]), int(row["previous_first_cell"]))):
				times[i] += ((row["appeared"] - prev) * 30)/abs(int(row["first_cell"]) - int(row["previous_first_cell"]))
		if(int(row["last_cell"]) - int(row["first_cell"]) > max_lines_on_screen):
			#print(row["first_cell"])
			#print(max_lines_on_screen)
			max_lines_on_screen = int(row["last_cell"]) - int(row["first_cell"]) 
	return times

def timeOnScreen(data):
	global max_lines_on_screen
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	#print((data["line_splits"]))
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		print row
		if(int(row["last_cell"]) - int(row["first_cell"]) > max_lines_on_screen):
			#print(row["first_cell"])
			#print(max_lines_on_screen)
			max_lines_on_screen = int(row["last_cell"]) - int(row["first_cell"])
		for i in range(int(row["first_cell"])-1, int(row["last_cell"])):
			times[i] += (row["appeared"] - prev)
	return times

def timeVersusProgress(data, plt):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime']).split('.')[0]]
	times = []
	lines = []
	for row in mycol.find():
		times.append(row["appeared"])
		lines.append(int(row["first_cell"]))
	plt.plot(times,lines)
	print times
	print lines


comp = findCompletedSessions()
print(len(comp))
x = comp[len(comp)-1]
#y = comp[len(comp)-4]

#print(y['article_data']['article_link'])
print(x['article_data']['article_link'])
f = plt.figure()

timeVersusProgress(x, plt)

#plt.plot(timeAsFirstCell(y))
#timeVersusProgress(x, plt)

f.savefig("foo.pdf", bbox_inches='tight')
#plt.plot(timeAsFirstCell(y))

# for i in timeAsFirstCell(y):
#  	if(i == 0):
#  		ynum += 1

plt.show()

plt.plot(timeAsFirstCell(x))
plt.plot(smoothed_timeAsFirstCell(x))
plt.show()
#graphSession(x, timeBetweenRows)

#print(max_lines_on_screen)
#print(findcompletedsessions())
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16