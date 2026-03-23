import { useState } from "react";

const strategies = [
  {
    id: 1,
    name: "Empty Room Cutoff",
    description: "Immediately cut power to fans and lights in all unoccupied rooms.",
    icon: "🚫",
  },
  {
    id: 2,
    name: "Night Mode (11PM - 5AM)",
    description: "Reduce all fans to low speed (35W) between 11PM and 5AM.",
    icon: "🌙",
  },
  {
    id: 3,
    name: "Temperature-Based Fan Control",
    description: "Fan runs only when room temperature exceeds 28°C (ASHRAE 55).",
    icon: "🌡️",
  },
  {
    id: 4,
    name: "Combined Optimisation",
    description: "Applies all three strategies simultaneously for maximum reduction.",
    icon: "⚡",
  },
];

export default function Simulation() {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runSimulation() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("http://localhost:5001/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId: selected }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Could not connect to backend. Make sure server is running.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 pt-28">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
        ⚡ Energy Strategy Simulator
      </h1>
      <p className="text-center text-gray-500 mb-8">
        Simulate energy saving strategies on the Digital Twin before real deployment
      </p>

      {/* Strategy Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
        {strategies.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`cursor-pointer rounded-xl p-5 border-2 transition-all ${
              selected === s.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <h2 className="font-bold text-gray-800">{s.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Run Button */}
      <div className="text-center mb-8">
        <button
          onClick={runSimulation}
          disabled={!selected || loading}
          className={`px-8 py-3 rounded-full text-white font-bold text-lg transition-all ${
            selected && !loading
              ? "bg-blue-600 hover:bg-blue-700 shadow-lg"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Running Simulation..." : "▶ Run Simulation"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              📊 Results: {result.strategyName}
            </h2>
            <p className="text-gray-500 text-sm">{result.strategyDescription}</p>
          </div>

          {/* Key Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Energy Saved</p>
              <p className="text-2xl font-bold text-green-600">
                {result.saved_kWh_year > 0 ? result.saved_kWh_year.toFixed(1) : 0}
              </p>
              <p className="text-xs text-gray-400">kWh/year</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Carbon Reduced</p>
              <p className="text-2xl font-bold text-blue-600">
                {result.saved_carbon_year > 0 ? result.saved_carbon_year.toFixed(1) : 0}
              </p>
              <p className="text-xs text-gray-400">kg CO₂/year</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Cost Saved</p>
              <p className="text-2xl font-bold text-yellow-600">
                ₹{result.saved_cost_inr_year > 0 ? result.saved_cost_inr_year.toFixed(0) : 0}
              </p>
              <p className="text-xs text-gray-400">per year</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Reduction</p>
              <p className="text-2xl font-bold text-purple-600">
                {result.reduction_pct > 0 ? result.reduction_pct.toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-400">energy cut</p>
            </div>
          </div>

          {/* Recommendation */}
          <div
            className={`rounded-xl p-4 mb-4 text-center font-bold text-lg ${
              result.recommendation === "STRONGLY RECOMMENDED"
                ? "bg-green-100 text-green-700 border border-green-300"
                : result.recommendation === "RECOMMENDED"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : result.recommendation === "CONSIDER"
                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {result.recommendation === "STRONGLY RECOMMENDED" ? "✅" :
             result.recommendation === "RECOMMENDED" ? "👍" :
             result.recommendation === "CONSIDER" ? "⚠️" : "❌"}{" "}
            {result.recommendation} — {result.recommendationReason}
          </div>

          {/* Block Breakdown */}
          <div className="bg-white rounded-xl shadow p-6 mb-4">
            <h3 className="font-bold text-gray-700 mb-4">📦 Block-wise Savings (kWh/year)</h3>
            <div className="space-y-3">
              {Object.entries(result.blockSavings).map(([block, data]) => (
                <div key={block}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Block {block}</span>
                    <span className="text-green-600 font-bold">
                      {data.savedEnergy_kWh_year > 0 ? data.savedEnergy_kWh_year.toFixed(1) : 0} kWh saved
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{
                        width: `${Math.min(
                          (data.savedEnergy_kWh_year /
                            Math.max(...Object.values(result.blockSavings).map(
                              (d) => d.savedEnergy_kWh_year
                            ))) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
            <p className="font-semibold mb-1">📚 Data Sources:</p>
            {result.dataSources.map((s, i) => (
              <p key={i}>• {s}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}