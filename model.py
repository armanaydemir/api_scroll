from __future__ import absolute_import, division, print_function, unicode_literals

import tensorflow as tf
from tensorflow.keras import layers
import os
import time
import pymongo
import pandas as pd
import numpy as np
import matplotlib
from matplotlib.lines import Line2D
#matplotlib.use("Agg")
import matplotlib.pyplot as plt
import statistics
import decimal
import sys
import re
import datetime
import math
import random
from sklearn.linear_model import LinearRegression
#from sklearn.model_selection import KFold

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


print(len(udid_dict))
# udid_dict = {}
# article_dict = {}
# for i in c:
# 	if(i["article_id"] not in article_dict.keys()):
# 		article_dict[i["article_id"]] = [i]
# 	else:
# 		article_dict[i["article_id"]].append(i)
# 	if(i["UDID"] not in udid_dict.keys()):
# 		udid_dict[i["UDID"]] = [i]
# 	else:
# 		udid_dict[i["UDID"]].append(i)

n_bins = 19
udid_hist = []
article_hist = []
for i in udid_dict:
	print(str(i) + " : " + str(len(udid_dict[i])))
	udid_hist.append(len(udid_dict[i]))
for i in article_dict:
	print(str(i) + " : " + str(len(article_dict[i])))
	article_hist.append(len(article_dict[i]))
counts, bins, patches = plt.hist(udid_hist, bins=n_bins)
plt.xticks(bins)
plt.yticks([1,2,3,4])
plt.xlabel("Number of Articles Read")
plt.ylabel("# of Participants")
# plt.show()
plt.clf()

def make_title(data):
	return ("UDID:" + data["UDID"] + " -  Article Link:" + data["article_data"]["article_link"] + " - Device:" + data["type"])


def timeVersusProgressAverage_helper(data):
	mycol = sessions[str(data["_id"])]
	times = []
	lines = []
	for row in mycol.find().sort(sort_param):
		times.append((row["appeared"] - data["startTime"])/time_offset)
		lines.append(int((row["first_cell"] + row["last_cell"])/2))
	return (np.array(times), np.array(lines))

def timeVersusProgress_helper(data, cell_string):
	mycol = sessions[str(data["_id"])]
	times = []
	lines = []
	for row in mycol.find().sort(sort_param):
		times.append((row["appeared"] - data["startTime"])/time_offset)
		lines.append(int(row[cell_string]))
	return (np.array(times), np.array(lines))
users = ["A0CA009C_BF85_4B86_94E9_1AC72729372C", "24F95563_FF38_41C0_969E_64DEDDA48DCE", "7D969264_E226_49EE_8833_89DCF9A43164"]

udids = list(udid_dict.keys())
articles = list(article_dict.keys())
cmap = plt.get_cmap('jet')

users_data = [udid_dict[i] for i in users]
users_rates = []
users_regression = []
colors = ["#b9ff00", "#ffa900", "#ff002d", "#ff009a", "#0003fd"]
labels = ["Little", "Below Average", "Average", "Above Average", "Complete"]
hh = []
for i in range(len(labels)):
	hh.append(Line2D([0], [0], color=colors[i], label=labels[i]))
for i in users:
	x = []
	y = []
	for data in udid_dict[i][::-1]:
		(times, lines) = timeVersusProgressAverage_helper(data)
		# if(int(data["survey_data"][0]["answers"][1]["option_id"]) not in prev):
		# 	ll = plt.plot(times,lines, label="Option " + str(int(data["survey_data"][0]["answers"][1]["option_id"])), color=colors[int(data["survey_data"][0]["answers"][1]["option_id"])-1])
		# 	handles.append(ll)
		# 	prev.append(int(data["survey_data"][0]["answers"][1]["option_id"]))
		# else:
		plt.plot(times,lines, color=colors[int(data["survey_data"][0]["answers"][1]["option_id"])-1])
		for time in times:
			woah = [time]
			# for ii in range(0, len(data["survey_data"][0]["answers"])):
				# print( data["survey_data"][0]["answers"][ii])
			woah.append(int(data["survey_data"][0]["answers"][1]["option_id"])-1)
			# for ii in range(0, len(articles)):
			# 	if(ii ==  articles.index(data["article_data"]["_id"])):
			# 		woah.append(1)
			# 	else:
			# 		woah.append(0)
			x.append(woah)
		for line in lines:
			y.append(line)
	plt.ylabel("Line #")
	plt.suptitle("Reading Progress Color Coded by Comprehension Response for Participant " + str(udids.index(i)))
	plt.legend(handles=hh)
	plt.xlabel("seconds since start of reading session")
	plt.savefig("./" + i  + "color_coded")
	plt.clf()
	x = np.array(x)
	y = np.array(y)
	model = LinearRegression(fit_intercept=False).fit(x, y)
	r_sq = model.score(x, y)
	print('coefficient of determination:', r_sq)
	print('intercept:', model.intercept_)
	print('slope:', model.coef_)
	users_regression.append([model.coef_, model.intercept_])
hard_articles = []
easy_articles = []
middle_articles = []
article_coefs = []
for i in range(1, len(users_regression[0][0])):
	print([users_regression[0][0][i], users_regression[1][0][i],users_regression[2][0][i]])
	article_coefs.append([users_regression[0][0][i], users_regression[1][0][i],users_regression[2][0][i]])

print("-------------")
#new model based on mozer suggestions
x = []
y = []
for i in users:
	for data in udid_dict[i]:
		(times, lines) = timeVersusProgressAverage_helper(data)
		for time in times:
			tempx = []
			for uu in users:
				if(i == uu):
					tempx.append(time)
				else:
					tempx.append(0)
			for ii in range(0, len(articles)):
				if(articles[ii] == data["article_data"]["_id"]):
					tempx.append(time)
				else:
					tempx.append(0)
			x.append(tempx)
		for line in lines:
			y.append(line)
x = np.array(x)
y = np.array(y)
model = LinearRegression(fit_intercept=False).fit(x, y)
r_sq = model.score(x, y)
print('coefficient of determination:', r_sq)
print('intercept:', model.intercept_)
print('slope:', model.coef_)
users_slops = model.coef_[:3]
users_slops = [i - (model.coef_[0]-0.44111436) for i in users_slops]
print(users_slops)
weights = model.coef_[3:]
weights = [i+(model.coef_[0]-0.44111436) for i in weights]
print(weights)

a = weights
ranked_indices = sorted(range(len(a)), key=lambda i: a[i], reverse=True)
print(ranked_indices[0])
print(a[ranked_indices[0]])
print(article_dict[articles[ranked_indices[0]]][0])
print(ranked_indices[1])
print(a[ranked_indices[1]])
print(article_dict[articles[ranked_indices[1]]][0])
print(ranked_indices[-1])
print(a[ranked_indices[-1]])
print(article_dict[articles[ranked_indices[-1]]][0])
print(ranked_indices[-2])
print(a[ranked_indices[-2]])
print(article_dict[articles[ranked_indices[-2]]][0])
# barWidth = 0.25
# user3 = []
# user4 = []
# user10 = []
# for i in article_coefs:
# 	user3.append(i[0])
# 	user4.append(i[1])
# 	user10.append(i[2])
# br1 = np.arange(len(user3))
# br2 = [x + barWidth for x in br1]
# br3 = [x + barWidth for x in br2]
# plt.figure(figsize =(20, 7))
# plt.bar(br1, user3, color ='r', width = barWidth,
#         edgecolor ='grey', label ='User 3')
# plt.bar(br2, user4, color ='g', width = barWidth,
#         edgecolor ='grey', label ='User 4')
# plt.bar(br3, user10, color ='b', width = barWidth,
#         edgecolor ='grey', label ='User 10')

# plt.xlabel('Article #')
# plt.ylabel('Weight')
# plt.xticks([r + barWidth for r in range(len(user3))],
#         [str(i) for i in range(len(user3))])
# plt.legend()
# plt.savefig("./articleweights2222")
# plt.clf()

# barWidth = 0.25
# user3 = []
# user4 = []
# user10 = []
# for i in article_coefs[10:]:
# 	user3.append(i[0])
# 	user4.append(i[1])
# 	user10.append(i[2])

# br1 = np.arange(len(user3))
# br2 = [x + barWidth for x in br1]
# br3 = [x + barWidth for x in br2]

# plt.bar(br1, user3, color ='r', width = barWidth,
#         edgecolor ='grey', label ='User 3')
# plt.bar(br2, user4, color ='g', width = barWidth,
#         edgecolor ='grey', label ='User 4')
# plt.bar(br3, user10, color ='b', width = barWidth,
#         edgecolor ='grey', label ='User 10')

# plt.xlabel('Article #')
# plt.ylabel('Weight')
# plt.xticks([r + barWidth for r in range(len(user3))],
#         [str(10+i) for i in range(len(user3))])
# plt.legend()
# plt.savefig("./articleweights10")
# plt.clf()
# #regression model with one hot for articles and users
# for i in range(0,len(users)):
# 	user = users[i]
# 	data = users_data[i]
# 	random.shuffle(data)

# 	num = int(len(data)/20)
# 	# lst = data
# 	# split_data = [lst[i:i + n] for i in range(0, len(lst), n)]
# 	for n in range(0, len(data), num):
# 		print(len(data))
# 		test_data = data[n:n + num] 
# 		training_data = data[:n] + data[n+num:]
# 		#training_data += users_data[(i+1)%3] + users_data[(i+2)%3]
# 		x = []
# 		y = []
# 		for training in training_data:
# 			(times, lines) = timeVersusProgressAverage_helper(training)
# 			for time in times:
# 				woah = [time]
# 				for ii in range(0, len(articles)):
# 					if(ii ==  articles.index(training["article_data"]["_id"])):
# 						woah.append(1)
# 					else:
# 						woah.append(0)
# 				for ii in range(0, len(users)):
# 					if(ii == i):
# 						woah.append(1)
# 					else:
# 						woah.append(0)
# 				x.append(woah)
# 			for line in lines:
# 				y.append(line)
# 		# for test in test_data: 
# 		# 	woah = [0]
# 		# 	for ii in range(0, len(articles)):
# 		# 		if(ii ==  articles.index(training["article_data"]["_id"])):
# 		# 			woah.append(1)
# 		# 		else:
# 		# 			woah.append(0)
# 		# 	for ii in range(0, len(users)):
# 		# 		if(ii == i):
# 		# 			woah.append(1)
# 		# 		else:
# 		# 			woah.append(0)
# 		# 	x.append(woah)
# 		# 	y.append(0)

# 		model = LinearRegression(fit_intercept=True).fit(x, y)
# 		r_sq = model.score(x, y)
# 		print('coefficient of determination:', r_sq)
# 		for test in test_data:
# 			(times, lines) = timeVersusProgressAverage_helper(test)
# 			plt.ylabel("Line #")
# 			plt.xlabel("seconds since start of reading session")
# 			plt.plot(times, lines)
# 			test_x = []
# 			for time in (0,10):
# 				woah = [time]
# 				for ii in range(0, len(articles)):
# 					if(ii ==  articles.index(test["article_data"]["_id"])):
# 						woah.append(1)
# 					else:
# 						woah.append(0)
# 				for ii in range(0, len(users)):
# 					if(ii == i):
# 						woah.append(1)
# 					else:
# 						woah.append(0)
# 				test_x.append(woah)
# 			predi = model.predict(test_x)
# 			rate = (predi[1] - predi[0])/10
# 			plt.plot([0, max(lines)], [0, max(lines)])
# 			plt.savefig("./regression_model_graphs/" + str(test["UDID"]) + "_" + str(test["article_data"]["_id"]) + "_" + str(n))
# 			plt.clf()
# pos = 0
# neg = 0
# for percent_difs in article_coefs:
# 	if(percent_difs[0] > 0 and percent_difs[1]> 0 and percent_difs[2] >0 ):
# 		pos += 1
# 		# easy_articles.append(articles.index(i))
# 		print("easy")
# 		print(sum(percent_difs)/len(percent_difs))
# 	elif(percent_difs[0] < 0 and percent_difs[1]< 0 and percent_difs[2] <0):
# 		neg += 1
# 		# hard_articles.append(articles.index(i))
# 		print("hard")
# 		print(sum(percent_difs)/len(percent_difs))
# 	else:
# 		# middle_articles.append(articles.index(i))
# 		print(sum(percent_difs)/len(percent_difs))
# 	print("-")
# print("======")
# print(pos)
# print(neg)
 
# print(articles)
# cmap = plt.get_cmap('jet')
# colors = cmap(np.linspace(0, 1.0, len(udids)))
# ## all sessions for udid  
# for i in users:
# 	times_list = []
# 	rates = []
# 	max_lines = 600
# 	plt.ylabel("Line #")
# 	plt.xlabel("seconds since start of reading session")
	
# 	color = colors[udids.index(i)]
# 	for data in udid_dict[i]:	
# 		(times, lines) = timeVersusProgressAverage_helper(data)
# 		rates.append(len(data["article_data"]["content"])/times[-1])
# 		plt.plot(times, lines, color=color)
# 	plt.grid()
# 	avg = sum(rates)/len(rates)
# 	avg_var = sum((x-avg)**2 for x in rates) / len(rates)
# 	users_rates.append((avg, avg_var))
# 	slope_times = [0, max_lines/avg]
# 	slope_lines = [0, max_lines]
# 	avg = users_regression[users.index(data["UDID"])][0]
# 	slope_times = [0, (max_lines/avg)]
# 	slope_lines = [0, max_lines]
# 	plt.plot(slope_times, slope_lines, color=color, linestyle='dashed', label="user " + str(udids.index(i)))
# plt.xlim([0, 1200])
# plt.ylim([max_lines, 0])
# plt.suptitle("Every Article's Session Data and Regression for Each User")
# plt.savefig("./regression_all_sessions", bbox_inches="tight")
# plt.clf()

# colors = cmap(np.linspace(0, 1.0, len(udids)))


# # ## all sessions for article 
# for i in article_dict:
# 	times_list = []
# 	plt.ylabel("Line #")
# 	plt.xlabel("seconds since start of reading session")
# 	plt.suptitle("All Sessions Data for Article " + str(articles.index(i)))
# 	max_lines = 0
# 	min_lines = 0
# 	avgs = []
# 	for data in article_dict[i]:	
# 		(times, lines) = timeVersusProgressAverage_helper(data)
# 		color = colors[udids.index(data["UDID"])]
# 		if(max(lines) > max_lines):
# 			max_lines = max(lines)
# 		if(min(lines) < min_lines):
# 			min_lines = min(lines)
# 		if(data["UDID"] in users):
# 			plt.plot(times, lines, label="user " + str(udids.index(data["UDID"])), color=color)
# 			avg = users_regression[users.index(data["UDID"])][0]
# 			avgs.append((avg, color))
# 	# for avg, color in avgs:
# 	# 	slope_times = [0, (max_lines/avg)]
# 	# 	slope_lines = [0, max_lines]
# 	# 	plt.plot(slope_times, slope_lines, color=color, linestyle='dashed')
# 	plt.legend()
# 	plt.grid()
# 	plt.ylim(max_lines, 0)
# 	plt.savefig("./3users_graphs/" + str(i) + "3users", bbox_inches="tight")
# 	plt.clf()


# [9, 14]
# [3, 4, 7, 8, 10, 11, 12, 17]
# hard adn easy articles for regression wihtout intercept_

# #[]
# [3, 4, 7, 8, 10, 11, 12, 17, 18, 19]
# hard and easy articles for regression with intercept_

# [0, 2, 5, 9, 14, 18]
# [3, 4, 7, 8, 12, 17]
# hard and easy articles for pure average of rates


# pos = 0
# neg = 0
# hard_articles = []
# easy_articles = []
# middle_articles = []
# for i in article_dict:
# 	percent_difs = []
# 	for data in article_dict[i]:
# 		if(data["UDID"] in users):
# 			(times, lines) = timeVersusProgressAverage_helper(data)
# 			session_rate = len(data["article_data"]["content"])/times[-1]
# 			user_rate = users_regression[users.index(data["UDID"])][0]
# 			percent_dif = ((session_rate - user_rate) * 100) / user_rate
# 			percent_difs.append(percent_dif)
# 	if(percent_difs[0] > 0 and percent_difs[1]> 0 and percent_difs[2] >0 ):
# 		pos += 1
# 		easy_articles.append(articles.index(i))
# 		print("easy")
# 		print(sum(percent_difs)/len(percent_difs))
# 	elif(percent_difs[0] < 0 and percent_difs[1]< 0 and percent_difs[2] <0):
# 		neg += 1
# 		hard_articles.append(articles.index(i))
# 		print("hard")
# 		print(sum(percent_difs)/len(percent_difs))
# 	else:
# 		middle_articles.append(articles.index(i))
# 		print(sum(percent_difs)/len(percent_difs))
# 	# print(percent_difs)
# 	# print(sum(percent_difs)/len(percent_difs))
# 	print("-")
# print(pos)
# print(neg)


# print(hard_articles)
# print(easy_articles)


# rate_model = tf.keras.Sequential([
# 	tf.keras.layers.Input(shape=(None,2)),
# 	tf.keras.layers.Dense(1, activation="relu")
# ])
# mse = tf.keras.losses.MeanAbsoluteError()
# rate_model.compile(optimizer='adam',
#       loss=mse,
#       metrics=['accuracy'])
# dtrain_x = []
# dtrain_y = []
# for i in article_dict:
# 	for t in range(0, len(users)):
# 		data = article_dict[i][0]
# 		dtrain_y.append(np.array(len(data["article_data"]["content"])/times[-1]))
# 		dtrain_x.append(np.array([users_rates[t][0], articles.index(i)]))
# print(len(dtrain_x))
# print(len(dtrain_y))
# rate_model.fit(np.array(dtrain_x), np.array(dtrain_y), epochs=10000)
# for i in range(0, len(dtrain_x)):
# 	print(rate_model.predict(np.array([dtrain_x[i]])))
# 	print(dtrain_y[i])
# 	print("------")


##all sessions for udid
# for i in udid_dict:
# 	print(i)
# 	rates = []
# 	for data in udid_dict[i]:
# 		(times, lines) = timeVersusProgressAverage_helper(data)
# 		rates.append(len(data["article_data"]["content"])/times[-1])
# 	print(rates)
# 	print(sum(rates)/len(rates))
# 	avg = sum(rates)/len(rates)
# 	print(sum((x-avg)**2 for x in rates) / len(rates))
# 	print("_______")


# example_session = c[-1]
# ex = example_session
# for ex in :
# 	print(ex["UDID"])
# 	print(ex["event_data"])
# 	print(ex["survey_data"])
# 	print("-----")


# text_file = open("3usersdata.txt", "w")
# text_file.write(str(users_data))
# text_file.close()

# print(len(users_data))
# print(users)


# #user reading model takes in 2 variables (time, article), and outputs number which relates to line #
# for i in range(0,len(users)):
# 	user = users[i]
# 	data = users_data[i]
# 	random.shuffle(data)

# 	num = int(len(data)/20)
# 	# lst = data
# 	# split_data = [lst[i:i + n] for i in range(0, len(lst), n)]
# 	for n in range(0, len(data), num):
# 		test_data = data[n:n + num] 
# 		training_data = data[:n] + data[n+num:]

# 		training_x= []
# 		training_y = []
# 		for tdata in training_data:
# 			line_count = tdata["article_data"]["line_count"]
# 			#article_index = articles.index(tdata["article_data"]["_id"]) #tf.one_hot([articles.index(tdata["article_data"]["_id"])], len(articles))
# 			#UDID_index = udids.index(tdata["UDID"])#tf.one_hot([udids.index(tdata["UDID"])], len(udids))
# 			(times, lines) = timeVersusProgressAverage_helper(tdata)#total_time = getTotalTime(tdata)
# 			tt = 0
# 			while(tt < len(times)):
# 				training_x.append(np.array([line_count, times[tt]]))
# 				training_y.append(np.array(lines[tt]))
# 				tt += 1

# 		test_x = []
# 		test_y = []
# 		for tdata in test_data:
# 			line_count = tdata["article_data"]["line_count"]
# 			#article_index = articles.index(tdata["article_data"]["_id"]) 
# 			#UDID_index = tf.one_hot([udids.index(tdata["UDID"])], len(udids))
# 			(times, lines) = timeVersusProgressAverage_helper(tdata)#total_time = getTotalTime(tdata)
# 			tt = 0
# 			while(tt < len(times)):
# 				test_x.append(np.array([line_count, times[tt]]))
# 				test_y.append(np.array(lines[tt]))
# 				tt += 1



# 		model = tf.keras.models.Sequential([
# 		  	tf.keras.layers.Input(shape=(None, 2)),
# 		  	tf.keras.layers.Dense(10, activation='relu'),
# 		  	tf.keras.layers.Dense(5, activation='relu'),
# 		  	tf.keras.layers.Dense(1, activation='relu')
# 		])
# 		mse = tf.keras.losses.MeanSquaredLogarithmicError()

# 		model.compile(optimizer='adam',
#               loss=mse,
#               metrics=['accuracy'])
# 		model.fit(np.array(training_x), np.array(training_y), epochs=50, validation_data=(np.array(test_x), np.array(test_y)))
# 		for graph_data in test_data:
# 			(times, lines) = timeVersusProgressAverage_helper(graph_data)
# 			plt.plot(times,lines)
# 			line_count = graph_data["article_data"]["line_count"]
# 			#article_index = articles.index(graph_data["article_data"]["_id"])
# 			new_times = []
# 			pred_lines = []
# 			secs = 0

# 			hit_max = False
# 			while(not hit_max and not secs > 1500):
# 				cur_line = model.predict(np.array([np.array([line_count, secs])]))[0][0]
# 				hit_max = cur_line >= max(lines)
# 				pred_lines.append(cur_line)
# 				new_times.append(secs)
# 				secs += 1
# 			plt.suptitle("Model prediction for user " + str(udids.index(str(graph_data["UDID"]))) + " : " + "article " + str(articles.index(graph_data["article_data"]["_id"])))
# 			plt.plot(new_times,pred_lines, color='purple', linestyle='dashed')
# 			# plt.plot(new_times,[pl+10 for pl in pred_lines], color='green')
# 			# plt.plot(new_times,[pl-10 for pl in pred_lines], color='green')
# 			avg = users_rates[i][0]
# 			slope_times = [0, max(lines)/avg]
# 			slope_lines = [0, max(lines)]
# 			plt.plot(slope_times, slope_lines, color='black', linestyle='dashed')
# 			plt.savefig("./rate_model_graphs/UDID" + str(graph_data["UDID"]) + "_fold" + str(n)   + "_" + str(graph_data["article_data"]["_id"]))
# 			plt.clf()

		
# for i in range(0,len(users)):
# 	user = users[i]
# 	data = users_data[i]
# 	random.shuffle(data)

# 	num = int(len(data)/4)
# lst = data
# 	# split_data = [lst[i:i + n] for i in range(0, len(lst), n)]
# 	for n in range(0, len(data), num):
# 		test_data = data[n:n + num] 
# 		training_data = data[:n] + data[n+num:]

# 		training_x= []
# 		training_y = []
# 		for tdata in training_data:
# 			line_count = tdata["article_data"]["line_count"]
# 			#article_index = articles.index(tdata["article_data"]["_id"]) #tf.one_hot([articles.index(tdata["article_data"]["_id"])], len(articles))
# 			#UDID_index = udids.index(tdata["UDID"])#tf.one_hot([udids.index(tdata["UDID"])], len(udids))
# 			(times, lines) = timeVersusProgressAverage_helper(tdata)#total_time = getTotalTime(tdata)
# 			tt = 0
# 			times_cnt = 0
# 			line_cache = 0
# 			while(tt < len(times)):
# 				if(times[tt] > times_cnt +1):
# 					training_x.append(np.array([line_count, times[tt], times_cnt, line_cache]))
# 					training_y.append(np.array(lines[tt]))
# 					times_cnt = times[tt]
# 					line_cache = lines[tt]
# 				tt += 1

# 		test_x = []
# 		test_y = []
# 		for tdata in test_data:
# 			line_count = tdata["article_data"]["line_count"]
# 			#article_index = articles.index(tdata["article_data"]["_id"]) 
# 			#UDID_index = tf.one_hot([udids.index(tdata["UDID"])], len(udids))
# 			(times, lines) = timeVersusProgressAverage_helper(tdata)#total_time = getTotalTime(tdata)
# 			tt = 0
# 			times_cnt = 0
# 			line_cache = 0
# 			while(tt < len(times)):
# 				if(times[tt] > times_cnt +1):
# 					test_x.append(np.array([line_count, times[tt], times_cnt, line_cache]))
# 					test_y.append(np.array(lines[tt]))
# 					times_cnt = times[tt]
# 					line_cache = lines[tt]
# 				tt += 1



# 		model = tf.keras.models.Sequential([
# 		  	tf.keras.layers.Input(shape=(None, 4)),
# 		  	tf.keras.layers.Dense(10, activation='relu'),
# 		  	tf.keras.layers.Dense(10, activation='relu'),
# 		  	tf.keras.layers.Dense(1, activation='relu')
# 		])
# 		mse = tf.keras.losses.MeanSquaredLogarithmicError()

# 		model.compile(optimizer='adam',
#               loss=mse,
#               metrics=['accuracy'])
# 		model.fit(np.array(training_x), np.array(training_y), epochs=10, validation_data=(np.array(test_x), np.array(test_y)))

# 		graph_data = test_data[0]
# 		(times, lines) = timeVersusProgressAverage_helper(graph_data)
# 		plt.plot(times,lines)
# 		tt = 0
# 		times_cnt = 0
# 		line_cache = 0
# 		while(tt < len(times)):
# 			if(times[tt] > times_cnt +1):
# 				test_x.append(np.array([line_count, times[tt], times_cnt, line_cache]))
# 				test_y.append(np.array(lines[tt]))
# 				times_cnt = times[tt]
# 				line_cache = lines[tt]
# 			tt += 1
# 		plt.plot(model.predict(np.array(test_x)))


		#plt.show()

		# line_count = graph_data["article_data"]["line_count"]
		# #article_index = articles.index(graph_data["article_data"]["_id"])
		# plt.plt(model.predict(gr))
		# new_times = []
		# pred_lines = []
		# for secs in range(0, int(max(times))):
		# 	#print(model.predict(np.array([np.array([line_count, article_index, secs])])))
		# 	pred_lines.append(model.predict(np.array([np.array([line_count, secs])]))[0][0])
		# 	new_times.append(secs)
		# plt.plot(new_times,pred_lines, color='purple')
		# plt.show()



















