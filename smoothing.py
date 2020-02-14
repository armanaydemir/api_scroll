import pymongo
import pandas as pd
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import decimal
import sys
import re
import os 
import datetime
import requests
import json

response = requests.post("http://localhost:22364/session_replay", data={'article_link': "5c185e60e99dca3d1e7e8c57","UDID": "232-wer"})
s = json.loads(response.content)

time_offset = 100000000


original = []
smoothed = []
lines = []
for v in s["session_data"]:
	lines.append(int(v["first_cell"]))
	original.append((v["appeared"] - v["startTime"])/time_offset)
	smoothed.append((v["smoothed"] - v["startTime"])/time_offset)

plt.plot(original,lines,label="original")
plt.plot(smoothed,lines,label="smoothed")
plt.legend()
plt.show()






