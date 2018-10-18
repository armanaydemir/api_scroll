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


acceptable_versions = ['v0.2.6']

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

#shows time each line spends as row
def timeAsRow(data, row_num):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime'])]
	print data["line_splits"]
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		times[data["line_splits"].index(int(row["first_word"]))+row_num] = (row["appeared"] - prev)
	return times


#shows time each line spends between rows
def timeBetweenRows(data, first, end):
	mycol = sessions[data['UDID'] + float_to_str(data['startTime'])]
	print((data["line_splits"]))
	times = [0]*len(data["line_splits"])
	prev = 0
	for row in mycol.find():
		if(prev == 0):
			prev = row["startTime"]
		for t in range(data["line_splits"].index(int(row["first_word"]))+first, data["line_splits"].index(int(row["first_word"]))+end):
			#print t
			if(t < len(data["line_splits"])):
				times[t] += (row["appeared"] - prev)
	return times


def graphSession(x, call):
	x["line_splits"] = map(int, x["line_splits"])
	sizeofrange = 20
	i = 0
	while(i+sizeofrange < len(x["line_splits"])):
		times = call(x, i, (i+sizeofrange))
		plt.plot(times)
		i += 1
	plt.show()



comp = findCompletedSessions()
x = comp[len(comp)-1]
print(len(comp))
graphSession(x, timeBetweenRows)



#print(findcompletedsessions())
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16