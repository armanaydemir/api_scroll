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


acceptable_versions = ['v0.2.5']

def findcompletedsessions():
	mycol = data["sessions"]
	completed = []
	for x in mycol.find():
		if(acceptable_versions.contains(x["version"]) and x["completed"] == True):
			completed.append(x)
	return completed


def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)

def timeAsLastLine(c):
	mycol = sessions[c]
	times = [0]*(99999)
	max = 0
	prev = 0
	for row in mycol.find():
		i = int(row["last_word"])
		if(max < int(row["last_word"])):
				max = int(row["last_word"])
		print(i)
		if(prev == 0):
			prev = row["startTime"]
		times[i] = (row["appeared"] - prev)
	#print(times)
	print(max)
	return times[:max:]



def timeOnScreenPerLine(c):
	mycol = sessions[c]
	print(mycol.count())
	times = [0]*99999
	max = 0
	for row in mycol.find():
		print(row)
		if(row["previous_first_word"]):
			row["previous_last_word"] = row["previous_last_word"]
			for i in range(int(row["previous_first_word"]), int(row["previous_last_word"])):
				if(max < int(row["previous_last_word"])):
					max = int(row["previous_last_word"])
				times[i] += row["appeared"] - row["previous_appeared"]
	print(max)
	return times[:int(max):]


# data_to_graph = [""]

comp = findcompletedsessions()
x = comp[len(comp)-1]
times = timeAsLastLine(x['UDID'] + float_to_str(x['startTime']))
data = {}
print(x)
plt.plot(times)
plt.show()
#print(findcompletedsessions())


#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16