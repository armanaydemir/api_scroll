from __future__ import absolute_import, division, print_function, unicode_literals

# import tensorflow as tf
# from tensorflow.keras import layers
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

# from pprint import pprint as print
# from gensim.models.fasttext import FastText as FT_gensim
# from gensim.test.utils import datapath
# import gensim

# import matplotlib
# #matplotlib.use("Agg")
# import matplotlib.pyplot as plt

now = datetime.datetime.now()
path = str(now.month) + '-' + str(now.day) + '-' + str(now.hour) + '-' + str(now.minute)

#acceptable_versions = ["v0.3.1", "v0.2.7","v0.2.7"] # 100000000
time_offset = 100000000

myclient = pymongo.MongoClient("mongodb://localhost:27017/")
sessions = myclient["sessions_official"]
sort_param = [("appeared", pymongo.ASCENDING), ("_id", pymongo.ASCENDING)]
data = myclient["data_official"]
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
		if( (x["completed"] or not incl_incomplete) and x["type"] != "x86_64"):
			#x["article_data"] = getArticle(x["article_id"])
			completed.append(x)
	return completed


# def getTotalTime(data):
# 	return data["endTime"] - data["startTime"]

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
		article_dict[i["article_id"]] = 1
	else:
		article_dict[i["article_id"]] += 1
	if(i["UDID"] not in udid_dict.keys()):
		udid_dict[i["UDID"]] = 1
	else:
		udid_dict[i["UDID"]] += 1
print(udid_dict)
print(article_dict)


#"----------"
# train_corpus = list(read_corpus(c[10:]))
# test_corpus = list(read_corpus(c[:10], tokens_only=True))
# #print(train_corpus[1])
# #print(test_corpus[1])
# model = gensim.models.doc2vec.Doc2Vec(vector_size=50, min_count=2, epochs=40)
# model.build_vocab(train_corpus)
# model.train(train_corpus, total_examples=model.corpus_count, epochs=model.epochs)
# print(train_corpus[5])
# vector = model.infer_vector(train_corpus[5].words)
# print(vector)
# sims = model.docvecs.most_similar([vector], topn=len(model.docvecs))
# print(sims)
# ranks = []
# second_ranks = []
# for doc_id in range(len(train_corpus)):
#     inferred_vector = model.infer_vector(train_corpus[doc_id].words)
#     sims = model.docvecs.most_similar([inferred_vector], topn=len(model.docvecs))
#     rank = [docid for docid, sim in sims][doc_id]
#     print(rank)
#     print(doc_id)
#     ranks.append(rank)

#     second_ranks.append(sims[1])

# import collections

# counter = collections.Counter(ranks)
# print(counter)



# # Define the model
# model = tf.keras.Sequential()
# # Adds a densely-connected layer with 64 units to the model:
# model.add(layers.Dense(1, activation='elu'))
# # Add another:
# #model.add(layers.Dense(5, activation='elu'))

# #model.add(layers.Dense(1, activation='elu'))
# model.compile(optimizer='adam',#adam
#               loss='mse',
#               metrics=['mae'])
# print(model.weights)
# model.fit(x,y,epochs=50000,validation_data=(vx, vy),callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=75,restore_best_weights=True)]) #batch_size=80
# print(model.weights)

# hh = (model.predict(XX))
# count = 0
# for i in range(0,len(hh)):
# 	if(abs(hh[i]-YY[i]) < 30):
# 		print(i)
# 		count += 1
# print(count)
# print(len(hh))









