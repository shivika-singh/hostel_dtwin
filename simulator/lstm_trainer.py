# ============================================================
# LSTM OCCUPANCY PREDICTOR — TRAINER
# Trains on generated time-series data
# Predicts whether a room will be empty in the next 30 minutes
# ============================================================

import numpy as np
import pandas as pd
import json, os, sys

# Suppress TF warnings
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

SEQUENCE_LEN = 12   # 12 timesteps × 5 min = 60 min history
HORIZON      = 6    # predict 6 steps ahead = 30 min
BATCH_SIZE   = 256
EPOCHS       = 30
FEATURES     = ["hour", "dow", "temperature", "co2",
                "light", "fan", "power", "occupancy"]

# ── Load data ────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")
MODEL_DIR  = os.path.dirname(__file__)

print("Loading training data...")
df = pd.read_csv(DATA_PATH)
print(f"  Loaded {len(df):,} records from {df['room_id'].nunique()} rooms")

# ── Build sequences per room ──────────────────────────────────
def build_sequences(room_df):
    """
    For each room: create (X, y) pairs where
    X = SEQUENCE_LEN consecutive timesteps of features
    y = occupancy HORIZON steps ahead (will room be occupied?)
    """
    room_df = room_df.sort_values("timestamp").reset_index(drop=True)
    data    = room_df[FEATURES].values.astype(np.float32)
    labels  = room_df["occupancy"].values.astype(np.float32)

    X, y = [], []
    for i in range(len(data) - SEQUENCE_LEN - HORIZON):
        X.append(data[i : i + SEQUENCE_LEN])
        y.append(labels[i + SEQUENCE_LEN + HORIZON])

    return np.array(X), np.array(y)

print("Building sequences (this takes ~1 minute)...")
X_all, y_all = [], []

for room_id, rdf in df.groupby("room_id"):
    X_r, y_r = build_sequences(rdf)
    X_all.append(X_r)
    y_all.append(y_r)
    if room_id % 5 == 0:
        print(f"  Room {room_id} done")

X = np.concatenate(X_all)
y = np.concatenate(y_all)
print(f"  Total sequences: {len(X):,}")
print(f"  Occupied next-30min: {y.mean()*100:.1f}%")

# ── Scale features ────────────────────────────────────────────
print("\nScaling features...")
n_samples, seq_len, n_features = X.shape
X_2d = X.reshape(-1, n_features)

scaler = MinMaxScaler()
X_2d_scaled = scaler.fit_transform(X_2d)
X_scaled = X_2d_scaled.reshape(n_samples, seq_len, n_features)

# Save scaler params
scaler_params = {
    "scale_":      scaler.scale_.tolist(),
    "min_":        scaler.min_.tolist(),
    "data_min_":   scaler.data_min_.tolist(),
    "data_max_":   scaler.data_max_.tolist(),
    "data_range_": scaler.data_range_.tolist(),
    "features":    FEATURES,
    "sequence_len": SEQUENCE_LEN,
    "horizon":     HORIZON
}
with open(os.path.join(MODEL_DIR, "scaler_params.json"), "w") as f:
    json.dump(scaler_params, f, indent=2)
print("  Scaler saved.")

# ── Train/test split ──────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, shuffle=True
)
print(f"  Train: {len(X_train):,} | Test: {len(X_test):,}")

# ── Build LSTM model ──────────────────────────────────────────
print("\nBuilding LSTM model...")
model = Sequential([
    LSTM(64, input_shape=(SEQUENCE_LEN, n_features),
         return_sequences=True),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation="relu"),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)
model.summary()

# ── Train ────────────────────────────────────────────────────
print("\nTraining...")
early_stop = EarlyStopping(
    monitor="val_loss", patience=4,
    restore_best_weights=True
)

history = model.fit(
    X_train, y_train,
    validation_split=0.15,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop],
    verbose=1
)

# ── Evaluate ──────────────────────────────────────────────────
print("\nEvaluating on test set...")
y_pred_prob = model.predict(X_test, verbose=0).flatten()
y_pred      = (y_pred_prob >= 0.5).astype(int)

print("\nClassification Report:")
print(classification_report(y_test, y_pred,
      target_names=["Will be EMPTY", "Will be OCCUPIED"]))

acc = (y_pred == y_test).mean() * 100
print(f"Overall Accuracy: {acc:.2f}%")

# ── Save model ────────────────────────────────────────────────
MODEL_PATH = os.path.join(MODEL_DIR, "lstm_model.keras")
model.save(MODEL_PATH)
print(f"\n✅ Model saved to {MODEL_PATH}")

# ── Save training results for paper ──────────────────────────
cm = confusion_matrix(y_test, y_pred)
results = {
    "accuracy_pct":  round(float(acc), 2),
    "test_samples":  int(len(y_test)),
    "train_samples": int(len(X_train)),
    "sequence_len":  SEQUENCE_LEN,
    "horizon_steps": HORIZON,
    "horizon_mins":  HORIZON * 5,
    "epochs_trained":len(history.history["loss"]),
    "final_val_loss":round(float(min(history.history["val_loss"])), 4),
    "confusion_matrix": cm.tolist(),
    "features_used": FEATURES
}
with open(os.path.join(MODEL_DIR, "lstm_results.json"), "w") as f:
    json.dump(results, f, indent=2)
print("✅ Results saved to lstm_results.json")
print("\nFinal Results:")
print(f"  Accuracy:      {acc:.2f}%")
print(f"  Horizon:       30 minutes ahead")
print(f"  Training data: {len(X_train):,} sequences")
print(f"  Test data:     {len(X_test):,} sequences")