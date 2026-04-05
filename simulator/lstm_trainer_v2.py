# ============================================================
# LSTM TRAINER V2 — Improved architecture for better accuracy
# Key changes: more data, better features, class balancing
# ============================================================
import numpy as np
import pandas as pd
import json, os, sys
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (classification_report,
                             confusion_matrix, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (LSTM, Dense, Dropout,
                                     BatchNormalization)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

SEQUENCE_LEN = 12   # 60 minutes of history
HORIZON      = 6    # predict 30 minutes ahead
BATCH_SIZE   = 512
EPOCHS       = 50
FEATURES     = ["hour", "dow", "temperature", "co2",
                "light", "fan", "power", "occupancy"]

print("Loading data...")
df = pd.read_csv(os.path.join(
    os.path.dirname(__file__), "training_data.csv"))
print(f"  {len(df):,} records loaded")

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
    X_all.append(Xr)
    y_all.append(yr)

X = np.concatenate(X_all)
y = np.concatenate(y_all)
print(f"  {len(X):,} sequences | occ rate: {y.mean()*100:.1f}%")

# Scale
n_s, s_l, n_f = X.shape
scaler = MinMaxScaler()
X_2d   = scaler.fit_transform(X.reshape(-1, n_f))
X_sc   = X_2d.reshape(n_s, s_l, n_f)

# Save scaler
sp = {
    "scale_":      scaler.scale_.tolist(),
    "min_":        scaler.min_.tolist(),
    "data_min_":   scaler.data_min_.tolist(),
    "data_max_":   scaler.data_max_.tolist(),
    "data_range_": scaler.data_range_.tolist(),
    "features":    FEATURES,
    "sequence_len": SEQUENCE_LEN,
    "horizon":     HORIZON
}
with open(os.path.join(os.path.dirname(__file__),
          "scaler_params.json"), "w") as f:
    json.dump(sp, f, indent=2)

X_tr, X_te, y_tr, y_te = train_test_split(
    X_sc, y, test_size=0.2,
    random_state=42, stratify=y)

# Class weights to handle imbalance
cw = compute_class_weight("balanced",
     classes=np.array([0,1]), y=y_tr)
class_weights = {0: cw[0], 1: cw[1]}
print(f"  Class weights: {class_weights}")

# Improved model
model = Sequential([
    LSTM(128, input_shape=(SEQUENCE_LEN, n_f),
         return_sequences=True),
    BatchNormalization(),
    Dropout(0.3),
    LSTM(64, return_sequences=True),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(32, activation="relu"),
    BatchNormalization(),
    Dense(16, activation="relu"),
    Dense(1,  activation="sigmoid")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="binary_crossentropy",
    metrics=["accuracy",
             tf.keras.metrics.AUC(name="auc"),
             tf.keras.metrics.Precision(name="precision"),
             tf.keras.metrics.Recall(name="recall")]
)
model.summary()

callbacks = [
    EarlyStopping(monitor="val_auc", patience=6,
                  mode="max", restore_best_weights=True),
    ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                      patience=3, min_lr=1e-5)
]

print("\nTraining improved LSTM...")
history = model.fit(
    X_tr, y_tr,
    validation_split=0.15,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks,
    class_weight=class_weights,
    verbose=1
)

# Evaluate
print("\nEvaluating...")
y_prob = model.predict(X_te, verbose=0).flatten()
y_pred = (y_prob >= 0.5).astype(int)

acc   = (y_pred == y_te).mean() * 100
auc   = roc_auc_score(y_te, y_prob) * 100
cm    = confusion_matrix(y_te, y_pred)

print("\nClassification Report:")
print(classification_report(y_te, y_pred,
      target_names=["Will be EMPTY","Will be OCCUPIED"]))
print(f"Accuracy : {acc:.2f}%")
print(f"AUC-ROC  : {auc:.2f}%")
print(f"Confusion Matrix:\n{cm}")

# Save model
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "lstm_model.keras")
model.save(MODEL_PATH)
print(f"\n✅ Model saved: {MODEL_PATH}")

# Save results
results = {
    "accuracy_pct":    round(float(acc), 2),
    "auc_roc_pct":     round(float(auc), 2),
    "test_samples":    int(len(y_te)),
    "train_samples":   int(len(X_tr)),
    "sequence_len":    SEQUENCE_LEN,
    "horizon_steps":   HORIZON,
    "horizon_mins":    HORIZON * 5,
    "epochs_trained":  len(history.history["loss"]),
    "final_val_loss":  round(float(
        min(history.history["val_loss"])), 4),
    "confusion_matrix": cm.tolist(),
    "features_used":   FEATURES,
    "architecture":    "3-layer LSTM + BatchNorm + Dropout",
    "class_weights":   {str(k): round(float(v), 3)
                        for k,v in class_weights.items()}
}
with open(os.path.join(os.path.dirname(__file__),
          "lstm_results.json"), "w") as f:
    json.dump(results, f, indent=2)
print("✅ Results saved: lstm_results.json")
print(f"\nFinal: Accuracy={acc:.2f}% | AUC={auc:.2f}%")