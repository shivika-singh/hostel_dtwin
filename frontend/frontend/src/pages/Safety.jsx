import { useState, useEffect } from "react";
import { API } from "../services/api";

const SAFE_LIMIT = 1200;

export default function Safety() {
  const [alarms, setAlarms]     = useState([]);
  const [summary, setSummary]   = useState(null);
  const [baseline, setBaseline] = useState(null);

  useEffect(() => {
    const load = () => {
      fetch(API.alarms).then(r => r.json()).then(setAlarms).catch(() => {});
      fetch(API.wardenSummary).then(r => r.json()).then(setSummary).catch(() => {});
      fetch(API.baseline).then(r => r.json()).then(setBaseline).catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function acknowledge(index) {
    await fetch(API.acknowledgeAlarm, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index })
    });
    setAlarms(prev => prev.map((a, i) => i === index ? { ...a, acknowledged: true } : a));
  }

  function loadColor(pct) {
    if (pct >= 100) return "bg-red-600";
    if (pct >= 95)  return "bg-red-400";
    if (pct >= 80)  return "bg-yellow-400";
    return "bg-green-400";
  }

  function loadLabel(pct) {
    if (pct >= 100) return { text: "⚡ EMERGENCY", cls: "text-red-700 font-bold animate-pulse" };
    if (pct >= 95)  return { text: "🔴 CRITICAL",  cls: "text-red-600 font-bold" };
    if (pct >= 80)  return { text: "🟡 WARNING",   cls: "text-yellow-600 font-semibold" };
    return { text: "🟢 NORMAL", cls: "text-green-600" };
  }

  const activeAlarms = alarms.filter(a => !a.acknowledged);
  const blocks = summary ? Object.entries(summary) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pt-28">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">🔌 Electrical Safety Monitor</h1>
      <p className="text-gray-500 text-sm mb-6">
        Real-time block load monitoring. Safe limit: 1,200W per block (IE Rules 1956).
      </p>

      {/* BLOCK LOAD METERS */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {blocks.map(([block, data]) => {
            const load = data.currentLoad_W || 0;
            const pct  = Math.min(120, (load / SAFE_LIMIT) * 100);
            const lbl  = loadLabel(pct);
            return (
              <div key={block} className={`bg-white rounded-xl border-2 p-4 shadow-sm
                ${pct >= 100 ? "border-red-400" : pct >= 80 ? "border-yellow-300" : "border-gray-100"}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">Block {block}</span>
                  <span className={`text-xs ${lbl.cls}`}>{lbl.text}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
                  <div
                    className={`h-4 rounded-full transition-all ${loadColor(pct)}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{load}W</span>
                  <span>{pct.toFixed(0)}% of {SAFE_LIMIT}W</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <div className="bg-gray-50 rounded p-1 text-center">
                    <p className="font-semibold">{data.occupiedRooms}</p>
                    <p className="text-gray-400">Occupied</p>
                  </div>
                  <div className={`rounded p-1 text-center ${data.wastageRooms > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                    <p className={`font-semibold ${data.wastageRooms > 0 ? "text-red-600" : ""}`}>{data.wastageRooms}</p>
                    <p className="text-gray-400">Wastage</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STATS ROW */}
      {baseline && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Load",    value: `${baseline.totalPower_W}W`,        icon: "⚡" },
            { label: "Wasted Power",  value: `${baseline.wastagePower_W}W`,       icon: "♻️" },
            { label: "Wastage Rooms", value: baseline.wastageRoomCount,           icon: "🚨" },
            { label: "Carbon Today",  value: `${baseline.carbon_kg_day} kg CO₂`, icon: "🌿" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE ALERTS */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold text-gray-800">
            Active Alerts
            {activeAlarms.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeAlarms.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400">Auto-refreshes every 5 seconds</p>
        </div>

        {activeAlarms.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-medium">No active alerts</p>
            <p className="text-sm">All rooms operating normally</p>
          </div>
        ) : (
          <div className="divide-y">
            {alarms.map((alarm, i) => !alarm.acknowledged && (
              <div key={i} className={`p-4 flex items-start justify-between gap-4
                ${alarm.severity === "EMERGENCY" ? "bg-red-50" :
                  alarm.severity === "CRITICAL"  ? "bg-orange-50" :
                  alarm.type === "WASTAGE"        ? "bg-yellow-50" : "bg-gray-50"}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${alarm.severity === "EMERGENCY" ? "bg-red-200 text-red-800" :
                        alarm.severity === "CRITICAL"  ? "bg-orange-200 text-orange-800" :
                        "bg-yellow-200 text-yellow-800"}`}>
                      {alarm.severity}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {alarm.room} — Block {alarm.block}
                    </span>
                    {alarm.wattageWasted && (
                      <span className="text-xs text-red-600">{alarm.wattageWasted}W wasted</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{alarm.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alarm.time).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => acknowledge(i)}
                  className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
