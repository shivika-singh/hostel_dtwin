import pandas as pd
from sklearn.linear_model import LogisticRegression
import requests

API_FETCH = "http://localhost:5001/liveStatus"

# dummy training data (represents past occupancy behavior)
data = {
    "hour": [8,9,10,11,12,13,14,15,22,23,0,1],
    "occupied": [1,1,1,0,0,0,0,1,1,1,0,0]
}

df = pd.DataFrame(data)

X = df[["hour"]]
y = df["occupied"]

model = LogisticRegression()
model.fit(X, y)

def predict_occupancy(current_hour):
    prediction = model.predict([[current_hour]])
    return int(prediction[0])

print("ML Occupancy Predictor Ready")
