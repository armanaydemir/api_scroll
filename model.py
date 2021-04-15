from __future__ import absolute_import, division, print_function, unicode_literals

# import tensorflow as tf
# from tensorflow.keras import layers
import os
import time
import pymongo
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import statistics
import decimal
import sys
import re
import datetime
import math

# from pprint import pprint as print
# from gensim.models.fasttext import FastText as FT_gensim
# from gensim.test.utils import datapath
# import gensim

# import matplotlib
# #matplotlib.use("Agg")
# import matplotlib.pyplot as plt

now = datetime.datetime.now()
path = str(now.month) + '-' + str(now.day) + '-' + str(now.hour) + '-' + str(now.minute)

acceptable_versions = ["v0.3.1", "v0.2.7","v0.2.7"] # 100000000
time_offset = 100000000

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions_official"]
surveys = myclient["questions_official"]
events = myclient["events_official"]
data = myclient["data_official"]

sort_param = [("appeared", pymongo.ASCENDING), ("_id", pymongo.ASCENDING)]
combined_sessions_collection = 'complete_sessions01'
combined_articles_collection = 'complete_articles01'

data_offset = 100000000


# num_epochs = 100
# total_series_length = 50000
# truncated_backprop_length = 15
# state_size = 4
# num_classes = 2
# echo_step = 3
# batch_size = 5
# num_batches = total_series_length//batch_size//truncated_backprop_length

def float_to_str(f): #https://stackoverflow.com/questions/38847690/convert-float-to-string-without-scientific-notation-and-false-precision
	ctx = decimal.Context()
	ctx.prec = 20
	d1 = ctx.create_decimal(repr(f))
	return format(d1, "f")


#returns article data given the id in the mongo db
def getArticle(id):
	mycol = data[combined_articles_collection]
	article = mycol.find_one({"_id": id})
	return article

def getEvents(id):
	mycol = events[id]
	ev = list(mycol.find())
	return ev


def getSurvey(id):
	mycol = surveys[id]
	surv = list(mycol.find())
	return surv


# def getSessionsSequence(data):
# 	return list(sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]].find())

#find all completed sessions in the acceptable versions
def findSessions(acceptable, incl_incomplete):
	mycol = data[combined_sessions_collection]
	completed = []
	for x in mycol.find():  #(x["UDID"] == "A48F157C_4768_44C9_86BF_6978C67BB756" or x["UDID"] == "828296DD_6B30_43B8_8986_8E12A13CD9F2")
		if( x["completed"] and x["type"] != "x86_64"):
			x["article_data"] = getArticle(x["article_id"])
			x["event_data"] = getEvents(str(x["_id"]))
			x["survey_data"] = getSurvey(str(x["_id"]))
			completed.append(x)
	return completed

def getAverageTime(data_list):
	total_time = 0.0
	for data in data_list:
		total_time += getTotalTime(data)
	if(float(len(data_list)) == 0):
		return "invalid"
	else:
		return total_time/float(len(data_list))


def getTotalTime(data):
	return data["endTime"] - data["startTime"]

# def getText(ses, tokens_only):
# 	line = ""
# 	for i in getArticle(ses['article_id'])["text"]:
# 		line += i + " "
# 	tokens = gensim.utils.simple_preprocess(line)
# 	if tokens_only:
# 		return tokens
# 	else:
# 		# For training data, add tags 
# 		return gensim.models.doc2vec.TaggedDocument(tokens, [i])


# def read_corpus(c, tokens_only=False):
# 	for ses in c:
# 		line = ""
# 		for i in getArticle(ses['article_id'])["text"]:
# 			line = line + i + " "
# 		print(line)
# 		print('------')
# 		tokens = gensim.utils.simple_preprocess(line)

# 		if tokens_only:
# 			yield tokens
# 		else:
# 			# For training data, add tags
# 			print(gensim.models.doc2vec.TaggedDocument(tokens, [i]))
# 			yield gensim.models.doc2vec.TaggedDocument(tokens, [i])

c = findSessions(acceptable_versions,False)


udid_dict = {}
article_dict = {}
for i in c:
	if(i["article_id"] not in article_dict.keys()):
		article_dict[i["article_id"]] = [i]
	else:
		article_dict[i["article_id"]].append(i)
	if(i["UDID"] not in udid_dict.keys()):
		udid_dict[i["UDID"]] = [i]
	else:
		udid_dict[i["UDID"]].append(i)
# print(udid_dict)
# print(article_dict)




udid_dict = {}
article_dict = {}
for i in c:
	if(i["article_id"] not in article_dict.keys()):
		article_dict[i["article_id"]] = [i]
	else:
		article_dict[i["article_id"]].append(i)
	if(i["UDID"] not in udid_dict.keys()):
		udid_dict[i["UDID"]] = [i]
	else:
		udid_dict[i["UDID"]].append(i)




# for i in article_dict:
# 	group_a = [] # responded yes to distracted (should be higher)
# 	group_b = [] # responded no to distracted (should be lower)
# 	print(i)
# 	print(len(article_dict[i]))
# 	for ses in article_dict[i]:
# 		if(int(ses["survey_data"][0]["answers"][3]["option_id"]) == 1):
# 			group_a.append(ses)
# 		else:
# 			group_b.append(ses)
# 	print(getAverageTime(group_a))
# 	print(getAverageTime(group_b))
# 	print("---------------------")


# for i in article_dict:
# 	group_a = [] # some event happened during reading session (should be higher)
# 	group_b = [] # no event happened during reading session (should be lower)
# 	print(i)
# 	print(len(article_dict[i]))
# 	for ses in article_dict[i]:
# 		if(len(ses["event_data"]) != 0):
# 			group_a.append(ses)
# 		else:
# 			group_b.append(ses)
# 	print(getAverageTime(group_a))
# 	print(getAverageTime(group_b))
# 	print("---------------------")

def make_title(data):
	return ("Start Time:" + str(data["startTime"]/time_offset) + " -  UDID:" + data["UDID"] + " -  Article Link:" + data["article_data"]["article_link"] + " - version:" +  data["version"])



def timeVersusProgress_helper(data, cell_string):
	mycol = sessions[str(data["_id"])]
	times = []
	lines = []
	for row in mycol.find().sort(sort_param):
		times.append((row["appeared"] - data["startTime"])/time_offset)
		lines.append(int(row[cell_string]))
	return (times, lines)

for i in article_dict:
	times_list = []
	for data in article_dict[i]:
		plt.ylabel("Line #")
		plt.xlabel("seconds since start of reading session")
		plt.suptitle(str(data["_id"]))
		(times, lines) = timeVersusProgress_helper(data, "first_cell")
		plt.plot(time, lines)
		# (times, lines) = timeVersusProgress_helper(data, "last_cell")
		# plt.plot(time, lines)
		plt.savefig(i + '/' + str(data["_id"]) + "timeVersusProgress.pdf", bbox_inches="tight")



# example_session = c[-1]
# ex = example_session
# for ex in :
# 	print(ex["UDID"])
# 	print(ex["event_data"])
# 	print(ex["survey_data"])
# 	print("-----")




