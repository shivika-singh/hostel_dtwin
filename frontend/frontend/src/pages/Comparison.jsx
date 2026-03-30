import { useState, useEffect } from "react";
import { API } from "../services/api";

const ICONS = { 1:"🚫", 2:"🌙", 3:"🌡️", 4:"⚡", 5:"⏱️", 6:"🔌" };

export default function Comparison() {
  const [strategies, setStrategies] = useState([]);
  const [baseline, setBaseline]     = useState(null);
  const [resultA, setResultA]       = useState(null);
  const [resultB, setResultB]       = useState(null);
  const [selA, setSelA]             = useState(null);
  const [selB, setSelB]             = useState(null);
  const [loadA, setLoadA]           = useState(false);
  const [loadB, setLoadB]           = useState(false);

  useEffect(() => {
    fetch(API.strategies).then(r => r.json()).then(setStrategies).catch(() => {});
    fetch(API.baseline).then(r => r.json()).then(setBaseline).catch(() => {});
  }, []);

  async function simulate(sid, setResult, setLoading) {
    if (!sid) return;
    setLoading(true);
    const res = await fetch(API.simulate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategyId: sid })
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  function MetricRow({ label, base, a, b, unit, lowerBetter = true }) {
    const vals = [a, b].filter(v => v !== undefined);
    const best = vals.length ? (lowerBetter ? Math.min(...vals) : Math.max(...vals)) : null;
    return (
      <div className="grid grid-cols-4 gap-2 py-2 border-b border-gray-50 text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="text-center text-gray-500">{base?.toLocaleString()}</span>
        <span className={`text-center font-semibold ${a === best ? "text-green-600" : "text-gray-700"}`}>
          {a !== undefined ? a?.toLocaleString() : "—"}
        </span>
        <span className={`text-center font-semibold ${b === best ? "text-green-600" : "text-gray-700"}`}>
          {b !== undefined ? b?.toLocaleString() : "—"}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pt-28">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">📊 Strategy Comparison</h1>
      <p className="text-gray-500 text-sm mb-6">
        Compare two strategies against the baseline Digital Twin. Green = better value.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* BASELINE */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-700 mb-3 text-center">📍 Original Baseline</h3>
          {baseline ? (
            <div className="space-y-2 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{baseline.totalPower_W}W</p>
                <p className="text-xs text-gray-500">Current Load</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-blue-700">{baseline.baseline_kWh_year}</p>
                  <p className="text-xs text-gray-400">kWh/year</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-green-700">{baseline.carbon_kg_year}</p>
                  <p className="text-xs text-gray-400">kg CO₂/yr</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center col-span-2">
                  <p className="font-bold text-purple-700">₹{baseline.cost_inr_year?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Cost/year</p>
                </div>
              </div>
              <div className={`rounded-lg p-2 text-center text-xs font-semibold
                ${baseline.wastageRoomCount > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {baseline.wastageRoomCount} rooms wasting energy
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center text-sm">Loading baseline...</p>
          )}
        </div>

        {/* STRATEGY A */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-700 mb-3 text-center">🅰️ Strategy A</h3>
          <select
            value={selA || ""}
            onChange={e => setSelA(Number(e.target.value))}
            className="w-full border border-blue-200 rounded-lg p-2 text-sm mb-3 bg-white"
          >
            <option value="">Select strategy...</option>
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{ICONS[s.id]} {s.name}</option>
            ))}
          </select>
          <button
            onClick={() => simulate(selA, setResultA, setLoadA)}
            disabled={!selA || loadA}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold mb-3 disabled:bg-gray-300"
          >
            {loadA ? "Simulating..." : "Simulate A"}
          </button>
          {resultA && (
            <div className="space-y-2 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-3xl font-black text-blue-700">{resultA.reduction_pct}%</p>
                <p className="text-xs text-gray-500">Reduction</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-blue-700">{resultA.optimised_kWh_year}</p>
                  <p className="text-xs text-gray-400">kWh/year</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-green-700">{resultA.saved_carbon_year}</p>
                  <p className="text-xs text-gray-400">CO₂ saved</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center col-span-2">
                  <p className="font-bold text-purple-700">₹{resultA.saved_cost_inr_year?.toLocaleString()} saved</p>
                  <p className="text-xs text-gray-400">vs baseline/year</p>
                </div>
              </div>
              <div className={`rounded-lg p-2 text-center text-xs font-semibold
                ${resultA.beeCompliant ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {resultA.beeCompliant ? "✅ BEE Compliant" : "❌ BEE Non-Compliant"}
              </div>
            </div>
          )}
        </div>

        {/* STRATEGY B */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <h3 className="font-bold text-purple-700 mb-3 text-center">🅱️ Strategy B</h3>
          <select
            value={selB || ""}
            onChange={e => setSelB(Number(e.target.value))}
            className="w-full border border-purple-200 rounded-lg p-2 text-sm mb-3 bg-white"
          >
            <option value="">Select strategy...</option>
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{ICONS[s.id]} {s.name}</option>
            ))}
          </select>
          <button
            onClick={() => simulate(selB, setResultB, setLoadB)}
            disabled={!selB || loadB}
            className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold mb-3 disabled:bg-gray-300"
          >
            {loadB ? "Simulating..." : "Simulate B"}
          </button>
          {resultB && (
            <div className="space-y-2 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-3xl font-black text-purple-700">{resultB.reduction_pct}%</p>
                <p className="text-xs text-gray-500">Reduction</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-blue-700">{resultB.optimised_kWh_year}</p>
                  <p className="text-xs text-gray-400">kWh/year</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="font-bold text-green-700">{resultB.saved_carbon_year}</p>
                  <p className="text-xs text-gray-400">CO₂ saved</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center col-span-2">
                  <p className="font-bold text-purple-700">₹{resultB.saved_cost_inr_year?.toLocaleString()} saved</p>
                  <p className="text-xs text-gray-400">vs baseline/year</p>
                </div>
              </div>
              <div className={`rounded-lg p-2 text-center text-xs font-semibold
                ${resultB.beeCompliant ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {resultB.beeCompliant ? "✅ BEE Compliant" : "❌ BEE Non-Compliant"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED COMPARISON TABLE */}
      {(resultA || resultB) && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-4">Detailed Metric Comparison</h3>
          <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-bold text-gray-500 uppercase">
            <span>Metric</span>
            <span className="text-center">Baseline</span>
            <span className="text-center text-blue-600">Strategy A</span>
            <span className="text-center text-purple-600">Strategy B</span>
          </div>
          <MetricRow label="Energy/year (kWh)" base={resultA?.baseline_kWh_year || resultB?.baseline_kWh_year} a={resultA?.optimised_kWh_year} b={resultB?.optimised_kWh_year} unit="kWh" />
          <MetricRow label="Carbon/year (kg)"  base={resultA?.baseline_carbon_year || resultB?.baseline_carbon_year} a={resultA?.optimised_carbon_year} b={resultB?.optimised_carbon_year} unit="kg" />
          <MetricRow label="Cost/year (₹)"     base={resultA?.baseline_cost_year || resultB?.baseline_cost_year} a={resultA?.optimised_cost_year} b={resultB?.optimised_cost_year} unit="₹" />
          <MetricRow label="Energy saved/year" base={0} a={resultA?.saved_kWh_year} b={resultB?.saved_kWh_year} unit="kWh" lowerBetter={false} />
          <MetricRow label="Cost saved/year"   base={0} a={resultA?.saved_cost_inr_year} b={resultB?.saved_cost_inr_year} unit="₹" lowerBetter={false} />
        </div>
      )}
    </div>
  );
}