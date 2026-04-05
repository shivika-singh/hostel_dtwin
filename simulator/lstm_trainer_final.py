import numpy as np
import pandas as pd
import json, os, sys
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (classification_report,
    confusion_matrix, roc_auc_score)
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

SEQUENCE_LEN = 12
HORIZON      = 6
BATCH_SIZE   = 256
EPOCHS       = 30
FEATURES     = ["hour","dow","temperature","co2",
                "light","fan","power","occupancy"]

print("Loading data...")
df = pd.read_csv(os.path.join(
    os.path.dirname(__file__), "training_data.csv"))
print(f"  {len(df):,} records")

def build_sequences(room_df):
    room_df = room_df.sort_values(
        "timestamp").reset_index(drop=True)
    data   = room_df[FEATURES].values.astype(np.float32)
    labels = room_df["occupancy"].values.astype(np.float32)
    X, y = [], []
    for i in range(len(data) - SEQUENCE_LEN - HORIZON):
        X.append(data[i: i + SEQUENCE_LEN])
        y.append(labels[i + SEQUENCE_LEN + HORIZON])
    return np.array(X), np.array(y)

print("Building sequences...")
X_all, y_all = [], []
for rid, rdf in df.groupby("room_id"):
    Xr, yr = build_sequences(rdf)
    X_all.append(Xr); y_all.append(yr)

X = np.concatenate(X_all)
y = np.concatenate(y_all)
print(f"  {len(X):,} sequences | occ: {y.mean()*100:.1f}%")

n_s, s_l, n_f = X.shape
scaler = MinMaxScaler()
X_2d   = scaler.fit_transform(X.reshape(-1, n_f))
X_sc   = X_2d.reshape(n_s, s_l, n_f)

sp = {
    "scale_":       scaler.scale_.tolist(),
    "min_":         scaler.min_.tolist(),
    "data_min_":    scaler.data_min_.tolist(),
    "data_max_":    scaler.data_max_.tolist(),
    "data_range_":  scaler.data_range_.tolist(),
    "features":     FEATURES,
    "sequence_len": SEQUENCE_LEN,
    "horizon":      HORIZON
}
with open(os.path.join(os.path.dirname(__file__),
          "scaler_params.json"), "w") as f:
    json.dump(sp, f, indent=2)

X_tr, X_te, y_tr, y_te = train_test_split(
    X_sc, y, test_size=0.2, random_state=42)

# Original architecture that gave 76%
model = Sequential([
    LSTM(64, input_shape=(SEQUENCE_LEN, n_f),
         return_sequences=True),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation="relu"),
    Dense(1,  activation="sigmoid")
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)
model.summary()

es = EarlyStopping(monitor="val_loss", patience=4,
                   restore_best_weights=True)

print("\nTraining...")
history = model.fit(
    X_tr, y_tr,
    validation_split=0.15,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[es],
    verbose=1
)

print("\nEvaluating...")
y_prob = model.predict(X_te, verbose=0).flatten()
y_pred = (y_prob >= 0.5).astype(int)

acc  = (y_pred == y_te).mean() * 100
auc  = roc_auc_score(y_te, y_prob) * 100
cm   = confusion_matrix(y_te, y_pred)

print(classification_report(y_te, y_pred,
      target_names=["EMPTY","OCCUPIED"]))
print(f"Accuracy : {acc:.2f}%")
print(f"AUC-ROC  : {auc:.2f}%")
print(f"Confusion Matrix:\n{cm}")

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "lstm_model.keras")
model.save(MODEL_PATH)

results = {
    "accuracy_pct":    round(float(acc), 2),
    "auc_roc_pct":     round(float(auc), 2),
    "test_samples":    int(len(y_te)),
    "train_samples":   int(len(X_tr)),
    "sequence_len":    SEQUENCE_LEN,
    "horizon_steps":   HORIZON,
    "horizon_mins":    30,
    "epochs_trained":  len(history.history["loss"]),
    "final_val_loss":  round(float(
        min(history.history["val_loss"])), 4),
    "confusion_matrix": cm.tolist(),
    "features_used":   FEATURES
}
with open(os.path.join(os.path.dirname(__file__),
          "lstm_results.json"), "w") as f:
    json.dump(results, f, indent=2)
print(f"\n✅ Done. Accuracy={acc:.2f}% AUC={auc:.2f}%")