from __future__ import absolute_import, division, print_function, unicode_literals

import tensorflow as tf
from tensorflow.keras import layers
import os
import time
import pymongo
import pandas as pd
import numpy as np
import decimal
import sys
import re
import datetime
import math

from pprint import pprint as print
from gensim.models.fasttext import FastText as FT_gensim
from gensim.test.utils import datapath

import matplotlib
#matplotlib.use("Agg")
import matplotlib.pyplot as plt

now = datetime.datetime.now()
path = str(now.month) + '-' + str(now.day) + '-' + str(now.hour) + '-' + str(now.minute)

acceptable_versions = ["v0.3.1", "v0.2.7","v0.2.7"] # 100000000
time_offset = 100000000

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions"]
sort_param = [("appeared", pymongo.ASCENDING), ("_id", pymongo.ASCENDING)]
data = myclient["data034"]
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

def getSessionsSequence(data):
	return list(sessions[data["UDID"] + float_to_str(data["startTime"]).split(".")[0]].find())

#find all completed sessions in the acceptable versions
def findSessions(acceptable, incl_incomplete):
	mycol = data[combined_sessions_collection]
	completed = []
	for x in mycol.find():  #(x["UDID"] == "A48F157C_4768_44C9_86BF_6978C67BB756" or x["UDID"] == "828296DD_6B30_43B8_8986_8E12A13CD9F2")
		if( (x["completed"] or not incl_incomplete) and x["type"] != "x86_64"):# and x["version"] in acceptable_versions):
			#x["article_data"] = getArticle(x["article_id"])
			completed.append(x)
	return completed

def clean_text(file_text):
	file_text = file_text.lower()
	file_text = re.sub("mr\.", "mr", file_text)
	file_text = re.sub("mrs\.", "mrs", file_text)
	file_text = re.sub("dr\.", "dr", file_text)
	file_text = re.sub("sr\.", "sr", file_text)
	file_text = re.sub(",", "", file_text)
	file_text = re.sub("\'", "", file_text)
	file_text = re.sub("-", "", file_text)
	file_text = re.sub("\"", "", file_text)
	file_text = re.sub("\s+", " ", file_text)
	return file_text

def analyse_text_helper(session_data):
	tmax = 0.0
	total = 0.0
	c = 0
	num_words = 0
	phrases = 0
	paragraphs = 0
	text = getArticle(session_data['article_id'])["text"]
	for i in range(0, len(text)):
		for t in text:
			c += 1
			ctext = clean_text(t)
			num_words += len(ctext.split())
			for word in ctext.split():
				if("." in word or ";" in word or ":" in word or "?" in word or "!" in word):
					phrases += 1
			paragraphs += 1

	return [paragraphs,phrases,num_words]

def getTotalTime(data):
	return data["endTime"] - data["startTime"]

def getFeatures(data,t):
	#print(data['content'])
	return(  [clean_text(data['content'][i]['text']) for i in range(t['first_cell'],t['last_cell'])] )

c = findSessions(acceptable_versions,True)
x = []
y = []

for ses in c[10::]:
	#ss = getSessionsSequence(ses)
	x.append(analyse_text_helper(ses))
	y.append([math.log(getTotalTime(ses)/data_offset)])
vx = []
vy = []

for ses in c[:10]:
	vx.append(analyse_text_helper(ses))
	vy.append([math.log(getTotalTime(ses)/data_offset)])


XX = []
YY = []
for ses in c:
	XX.append(analyse_text_helper(ses))
	YY.append([math.log(getTotalTime(ses)/data_offset)])
plt.scatter([i[0] for i in XX], YY)
#plt.show()
plt.scatter([i[1] for i in XX], YY)
#plt.show()
plt.scatter([i[2] for i in XX], YY)
#plt.show()

print(x)
print(vx)
# Define the model
model = tf.keras.Sequential()
# Adds a densely-connected layer with 64 units to the model:
model.add(layers.Dense(1, activation='elu', input_shape=(3,)))
# Add another:
#model.add(layers.Dense(5, activation='elu'))

#model.add(layers.Dense(1, activation='elu'))
model.compile(optimizer='adam',#adam
              loss='mse',
              metrics=['mae'])
print(model.weights)
model.fit(x,y,epochs=50000,validation_data=(vx, vy),callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=75,restore_best_weights=True)]) #batch_size=80
print(model.weights)

hh = (model.predict(XX))
count = 0
for i in range(0,len(hh)):
	if(abs(hh[i]-YY[i]) < 30):
		print(i)
		count += 1
print(count)
print(len(hh))









