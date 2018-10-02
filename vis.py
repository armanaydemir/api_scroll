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

def findcompletedsessions():
	mycol = data["sessions"]
	completed = []
	for x in mycol.find():
		if(x["completed"]):
			completed.append(x['UDID'] + float_to_str(x['startTime']))
	return completed


def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)

def averageperline(c):
	mycol = sessions[c]
	print(mycol.count())
	times = [0]*1197
	for row in mycol.find():
		for i in range(int(row["first_line"]), int(row["last_line"])):
			print(i)
			times[i] += row["time"] - row["appeared"]
	return times


d = findcompletedsessions()
times = averageperline(d[0])
data = {}
cur = times[0]
df3 = pd.DataFrame(times, columns=['B']).cumsum
df3['A'] = pd.Series(list(range(len(df))))
df3.plot(x='A', y='B')



#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16