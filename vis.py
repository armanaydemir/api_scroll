import pymongo

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
mydb = myclient["data"]

def printcol(c):
	mycol = mydb[c]
	for x in mycol.find():
		print(x)

printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")