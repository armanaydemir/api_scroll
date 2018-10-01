import pymongo

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions"]
data = myclient["data"]

def firstcompletedsession():
	mycol = data["sessions"]
	for x in mycol.find():
		if(x["completed"]):
			print x['UDID'] + x['startTime']


def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)


firstcompletedsession()
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16