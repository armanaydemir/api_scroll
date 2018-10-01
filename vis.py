import pymongo
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
	times = [None]*1000
	mycol = sessions[c]
	for row in mycol.find():
		for i in range(int(row["first_line"]), int(row["last_line"]))
			times[i] += row["time"] - row["appeared"]
	return times


sessions = findcompletedsessions()
print averageperline(sessions[0])



#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16