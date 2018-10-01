import pymongo
import decimal

# create a new context for this task
ctx = decimal.Context()

# 20 digits should be enough for everyone :D
ctx.prec = 20

def float_to_str(f):
    """
    Convert the given float to a string,
    without resorting to scientific notation
    """
    d1 = ctx.create_decimal(repr(f))
    return format(d1, 'f')

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions"]
data = myclient["data"]

def firstcompletedsession():
	mycol = data["sessions"]
	for x in mycol.find():
		if(x["completed"]):
			printcol(x['UDID'] + float_to_str(x['startTime']))


def printcol(c):
	mycol = sessions[c]
	for x in mycol.find():
		print(x)


firstcompletedsession()
#printcol("2D61165D_CDA0_42BF_9A88_F2E2C384F33455995508133834600")


#2D61165D_CDA0_42BF_9A88_F2E2C384F334
#5.59860231422299e+16