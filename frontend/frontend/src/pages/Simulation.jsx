import { useState, useEffect } from "react";
import { API } from "../services/api";

const ICONS = { 1:"🚫", 2:"🌙", 3:"🌡️", 4:"⚡", 5:"⏱️", 6:"🔌" };
const COLORS = {
  "STRONGLY RECOMMENDED": "bg-green-100 text-green-800 border-green-300",
  "RECOMMENDED":          "bg-blue-100 text-blue-800 border-blue-300",
  "CONSIDER":             "bg-yellow-100 text-yellow-800 border-yellow-300",
  "LOW IMPACT":           "bg-gray-100 text-gray-600 border-gray-300",
  "NOT SUITABLE":         "bg-red-100 text-red-700 border-red-300",
};

export default function Simulation() {
  const [strategies, setStrategies]   = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected]       = useState(null);
  const [result, setResult]           = useState(null);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [baseline, setBaseline]       = useState(null);
  const [deployed, setDeployed]       = useState(null);
  const [error, setError]             = useState("");

  useEffect(() => {
    fetch(API.strategies).then(r => r.json()).then(setStrategies).catch(() => {});
    fetch(API.suggest).then(r => r.json()).then(setSuggestions).catch(() => {});
    fetch(API.baseline).then(r => r.json()).then(setBaseline).catch(() => {});
  }, []);

  async function runSimulation() {
    if (!selected) { setError("Please select a strategy first."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(API.simulate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId: selected })
      });
      const data = await res.json();
      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 3));
    } catch {
      setError("Simulation failed. Make sure backend is running.");
    }
    setLoading(false);
  }

  async function applyStrategy() {
    if (!result) return;
    await fetch(API.applyStrategy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategyId: result.strategyId })
    });
    alert(`Strategy "${result.strategyName}" applied to Digital Twin.`);
  }

  async function deployStrategy() {
    if (!result) return;
    const res = await fetch(API.deployStrategy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategyId: result.strategyId })
    });
    const data = await res.json();
    setDeployed(data);
    alert(`✅ Strategy deployed as active hostel energy policy!`);
  }

  const recClass = result
    ? (COLORS[result.recommendation] || "bg-gray-100 text-gray-700 border-gray-300")
    : "";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pt-28">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">
        ⚡ Strategy Simulation Engine
      </h1>
      <p className="text-gray-500 mb-6 text-sm">
        Test energy conservation strategies on the Digital Twin before deploying to the real hostel.
      </p>

      {/* SUGGESTIONS BANNER */}
      {suggestions && suggestions.suggestions && suggestions.suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">
            🤖 System Recommendation (based on live hostel state)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.suggestions.map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-blue-100 p-3">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-800 text-sm">{s.strategyName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                    ${s.urgency === "HIGH" ? "bg-red-100 text-red-700" :
                      s.urgency === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"}`}>
                    {s.urgency}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                {s.strategyId > 0 && (
                  <button
                    onClick={() => setSelected(s.strategyId)}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Select this strategy →
                  </button>
                )}
              </div>
            ))}
          </div>
          {suggestions.summary && (
            <p className="text-xs text-blue-600 mt-2">
              Live snapshot: {suggestions.summary.occupiedRooms} occupied,
              {" "}{suggestions.summary.wastageRooms} wastage rooms,
              {" "}avg temp {suggestions.summary.avgTemperature}°C
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — STRATEGY SELECTOR */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Select a Strategy</h2>
          <div className="space-y-2">
            {strategies.map(s => (
              <div
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`border rounded-xl p-4 cursor-pointer transition-all
                  ${selected === s.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ICONS[s.id] || "📊"}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                      {s.beeAligned && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          BEE Aligned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  </div>
                  {selected === s.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            onClick={runSimulation}
            disabled={loading || !selected}
            className={`mt-4 w-full py-3 rounded-xl font-semibold text-white transition-all
              ${loading || !selected
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}
          >
            {loading ? "⏳ Running Simulation..." : "▶ Run Simulation"}
          </button>
        </div>

        {/* RIGHT — RESULTS */}
        <div>
          {!result && !loading && (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center text-gray-400 py-16">
                <p className="text-4xl mb-3">📊</p>
                <p className="font-medium">Select a strategy and run simulation</p>
                <p className="text-sm mt-1">Results will appear here</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex items-center justify-center bg-blue-50 rounded-xl border-2 border-blue-100">
              <div className="text-center py-16">
                <div className="animate-spin text-4xl mb-4">⚙️</div>
                <p className="text-blue-700 font-medium">Simulating...</p>
                <p className="text-blue-500 text-sm mt-1">Calculating savings</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {ICONS[result.strategyId]} {result.strategyName}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1">{result.strategyDescription}</p>
                  </div>
                  <span className={`border text-sm font-bold px-3 py-1 rounded-full ${recClass}`}>
                    {result.recommendation}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">{result.recommendationReason}</p>
              </div>

              <div className={`rounded-xl p-4 text-center border ${
                result.reduction_pct > 20 ? "bg-green-50 border-green-200" :
                result.reduction_pct > 0  ? "bg-yellow-50 border-yellow-200" :
                "bg-red-50 border-red-200"}`}>
                <p className="text-5xl font-black">
                  {result.reduction_pct > 0 ? "↓" : "↑"} {Math.abs(result.reduction_pct)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">Annual Energy Reduction</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Energy Saved", value: `${result.saved_kWh_year?.toLocaleString()} kWh`, unit: "/year", color: "blue" },
                  { label: "Carbon Saved", value: `${result.saved_carbon_year?.toLocaleString()} kg`, unit: "CO₂/year", color: "green" },
                  { label: "Cost Saved",   value: `₹${result.saved_cost_inr_year?.toLocaleString()}`, unit: "/year", color: "purple" },
                ].map((m, i) => (
                  <div key={i} className={`bg-${m.color}-50 border border-${m.color}-100 rounded-xl p-3 text-center`}>
                    <p className={`text-lg font-bold text-${m.color}-700`}>{m.value}</p>
                    <p className={`text-xs text-${m.color}-500`}>{m.unit}</p>
                    <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">Baseline vs Optimised (Annual)</h4>
                {[
                  { label: "Energy", baseline: result.baseline_kWh_year,   optimised: result.optimised_kWh_year,   unit: "kWh" },
                  { label: "Carbon", baseline: result.baseline_carbon_year, optimised: result.optimised_carbon_year, unit: "kg CO₂" },
                  { label: "Cost",   baseline: result.baseline_cost_year,   optimised: result.optimised_cost_year,   unit: "₹" },
                ].map((row, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{row.label}</span>
                      <span>{row.optimised?.toLocaleString()} / {row.baseline?.toLocaleString()} {row.unit}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (row.optimised / row.baseline) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {result.blockSavings && (
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 text-sm mb-3">Block-wise Savings (kWh/year)</h4>
                  {Object.entries(result.blockSavings).map(([block, data]) => (
                    <div key={block} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{block}</span>
                        <span className="text-green-600">↓ {data.savedEnergy_kWh_year?.toLocaleString()} kWh</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (data.savedPower_W / 500) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`rounded-xl border p-3 flex items-center gap-3
                ${result.beeCompliant ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <span className="text-2xl">{result.beeCompliant ? "✅" : "❌"}</span>
                <div>
                  <p className="font-semibold text-sm">
                    {result.beeCompliant ? "BEE Compliant" : "BEE Non-Compliant"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Benchmark: 15–25 kWh/person/month (Bureau of Energy Efficiency, India)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={applyStrategy}
                  className="py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-sm transition-all"
                >
                  🔧 Apply to Digital Twin
                </button>
                <button
                  onClick={deployStrategy}
                  className="py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-all"
                >
                  🚀 Deploy as Policy
                </button>
              </div>

              {deployed && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                  ✅ Strategy deployed at {new Date(deployed.deployedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {history.length > 1 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-700 mb-3">Previous Simulations This Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {history.map((h, i) => (
              <div key={i} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{ICONS[h.strategyId]} {h.strategyName}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COLORS[h.recommendation] || ""}`}>
                    {h.reduction_pct}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Energy saved: {h.saved_kWh_year?.toLocaleString()} kWh/yr</p>
                <p className="text-xs text-gray-500">Carbon saved: {h.saved_carbon_year?.toLocaleString()} kg/yr</p>
                <p className="text-xs text-gray-500">Cost saved: ₹{h.saved_cost_inr_year?.toLocaleString()}/yr</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}