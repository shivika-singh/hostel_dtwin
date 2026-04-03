import { useState, useEffect } from "react";

export default function Prediction() {
  const [predictions, setPredictions] = useState(null);
  const [modelInfo, setModelInfo]     = useState(null);
  const [modelError, setModelError]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [lastRun, setLastRun]         = useState(null);
  const [error, setError]             = useState(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

  useEffect(() => {
    fetch(`${API}/lstm-status`)
      .then(r => r.json())
      .then(data => {
        setModelInfo(data);
        if (!data.loaded) setModelError(true);
      })
      .catch(() => setModelError(true));
  }, []);

  async function runPrediction() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPredictions(data);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message || "Prediction failed. Is the backend running?");
    }
    setLoading(false);
  }

  const actionColor = (action) => ({
    PREPARE_CUTOFF: "bg-yellow-50 border-yellow-300 text-yellow-800",
    CUT_NOW:        "bg-red-50 border-red-300 text-red-800",
    RESTORE:        "bg-blue-50 border-blue-300 text-blue-800",
    NONE:           "bg-green-50 border-green-200 text-green-700",
  }[action] || "bg-gray-50 border-gray-200 text-gray-600");

  const actionIcon = (action) => ({
    PREPARE_CUTOFF: "⚠️",
    CUT_NOW:        "🔴",
    RESTORE:        "🔄",
    NONE:           "✅",
  }[action] || "⚪");

  return (
    // ← pt-20 pushes content below the fixed navbar (navbar height ≈ 64px)
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            LSTM Occupancy Predictor
          </h1>
          <p className="text-gray-500 text-sm">
            Predicts whether each room will be occupied or empty
            in the next 30 minutes using a trained LSTM neural network.
          </p>
        </div>
        {lastRun && (
          <span className="text-xs text-gray-400 mt-2 whitespace-nowrap ml-4">
            Last run: {lastRun}
          </span>
        )}
      </div>

      {/* Model Info Banner — shows even if model not trained yet */}
      {modelInfo && modelInfo.loaded ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">Model</p>
              <p className="text-indigo-800 font-bold">LSTM Neural Network</p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">Accuracy</p>
              <p className="text-indigo-800 font-bold text-xl">{modelInfo.accuracy_pct}%</p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">Predicts</p>
              <p className="text-indigo-800 font-bold">30 min ahead</p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">Trained on</p>
              <p className="text-indigo-800 font-bold">
                {modelInfo.train_samples?.toLocaleString()} sequences
              </p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">History window</p>
              <p className="text-indigo-800 font-bold">60 minutes</p>
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase">Epochs</p>
              <p className="text-indigo-800 font-bold">{modelInfo.epochs_trained}</p>
            </div>
          </div>
        </div>
      ) : modelError ? (
        // Model not trained yet — show a helpful warning instead of blank space
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-amber-800 mb-1">⚠️ LSTM model not trained yet</p>
          <p className="text-sm text-amber-700">
            Run these commands first, then refresh the page:
          </p>
          <div className="mt-2 bg-amber-100 rounded-lg p-3 font-mono text-xs text-amber-900 space-y-1">
            <p>cd ~/hostel_dtwin/simulator</p>
            <p>source venv/bin/activate</p>
            <p>python3 generate_training_data.py</p>
            <p>python3 lstm_trainer.py</p>
          </div>
        </div>
      ) : (
        // Still loading status
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 animate-pulse">
          <p className="text-gray-400 text-sm">Checking model status…</p>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={runPrediction}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-white text-lg mb-6 transition-all
          ${loading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-lg"}`}
      >
        {loading
          ? "⏳ Running LSTM Predictions…"
          : "▶  Run 30-Minute Occupancy Prediction"}
      </button>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-800 text-sm">
          <p className="font-semibold mb-1">❌ Error</p>
          <p>{error}</p>
          <p className="mt-2 text-xs text-red-600">
            Make sure <code className="bg-red-100 px-1 rounded">node server.js</code> is
            running in the backend folder and the LSTM model is trained.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {predictions && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Rooms Going Empty",
                value: predictions.roomsGoingEmpty?.length ?? 0,
                sub: "in ~30 min",
                color: "text-yellow-600", bg: "bg-yellow-50", icon: "⚠️"
              },
              {
                label: "Students Returning",
                value: predictions.roomsReturning?.length ?? 0,
                sub: "predicted",
                color: "text-blue-600", bg: "bg-blue-50", icon: "🚶"
              },
              {
                label: "Proactive Saving",
                value: `${predictions.proactiveSavings_W ?? 0}W`,
                sub: "power can be cut early",
                color: "text-green-600", bg: "bg-green-50", icon: "⚡"
              },
              {
                label: "Daily kWh Saved",
                value: `${predictions.proactiveSavings_kWh_day ?? 0}`,
                sub: "kWh from early action",
                color: "text-purple-600", bg: "bg-purple-50", icon: "🔋"
              },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl border p-4`}>
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Room-level predictions */}
          <div className="bg-white rounded-xl border shadow-sm mb-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Room-Level Predictions</h2>
              <p className="text-xs text-gray-400">
                {Object.keys(predictions.predictions || {}).length} rooms analysed
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y">
              {Object.entries(predictions.predictions || {})
                .sort(([, a], [, b]) => {
                  const order = { CUT_NOW: 0, PREPARE_CUTOFF: 1, RESTORE: 2, NONE: 3 };
                  return (order[a.action] ?? 4) - (order[b.action] ?? 4);
                })
                .map(([roomId, pred]) => (
                  <div key={roomId} className={`p-3 border ${actionColor(pred.action)}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm">{roomId}</span>
                      <span className="text-lg">{actionIcon(pred.action)}</span>
                    </div>
                    <p className="text-xs font-semibold mb-1">
                      {pred.willBeOccupied ? "Will be OCCUPIED" : "Will be EMPTY"}
                      {" "}({pred.confidence}% conf.)
                    </p>
                    <p className="text-xs opacity-75 leading-tight">{pred.recommendation}</p>
                    {pred.method === "lstm" && (
                      <p className="text-xs mt-1 opacity-50 font-mono">
                        LSTM · p={pred.rawProbability}
                      </p>
                    )}
                    {pred.method === "rule_based_fallback" && (
                      <p className="text-xs mt-1 opacity-50">
                        Fallback rule · {pred.historyAvailable}/{pred.historyNeeded} history
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Rooms needing attention */}
          {predictions.roomsGoingEmpty?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Proactive Action Recommended</h3>
              <p className="text-sm text-yellow-700 mb-2">
                These rooms are predicted to become empty within 30 minutes.
                Reducing their load now prevents wastage before it starts.
              </p>
              <div className="flex flex-wrap gap-2">
                {predictions.roomsGoingEmpty.map(r => (
                  <span key={r}
                    className="px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-sm font-semibold">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!predictions && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🧠</p>
          <p className="font-medium text-lg">Click the button to run predictions</p>
          <p className="text-sm mt-1">
            The LSTM model will analyse current room states and predict
            occupancy 30 minutes into the future
          </p>
        </div>
      )}
    </div>
  );
}
