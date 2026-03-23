import { useEffect, useState } from "react";
import BlockComparisonTable from "../components/BlockComparisonTable";

export default function Admin() {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await fetch("http://localhost:5001/wardenSummary");
      const data = await res.json();
      setSummary(data);
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 3000);
    return () => clearInterval(interval);
  }, []);

  let totalEnergy = 0;
  let occupiedRooms = 0;
  let wastageRooms = 0;
  let alerts = [];

  Object.values(summary).forEach(block => {
    totalEnergy += Number(block.energyToday_kWh);
    occupiedRooms += block.occupiedRooms;
    wastageRooms += block.wastageRooms;
    alerts = alerts.concat(block.alerts);
  });

  return (
    <div className="pt-28 bg-gray-50 min-h-screen">
      <h2 className="text-4xl font-bold text-center mb-12">
        Warden Dashboard
      </h2>

      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8">
        <Metric title="Total Energy Today" value={`${totalEnergy.toFixed(2)} kWh`} />
        <Metric title="Occupied Rooms" value={occupiedRooms} />
        <Metric title="Wastage Rooms" value={wastageRooms} />
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 mt-6">
        <Metric title="Carbon Today" value={`${(totalEnergy * 0.82).toFixed(3)} kg CO₂`} />
        <Metric title="Annual Carbon" value={`${(totalEnergy * 0.82 * 365).toFixed(1)} kg CO₂`} />
        <Metric title="Annual Cost" value={`Rs. ${(totalEnergy * 8 * 365).toFixed(0)}`} />
      </div>
      <BlockComparisonTable summary={summary} />

<div className="max-w-5xl mx-auto mt-10 bg-white p-6 rounded-xl shadow">
  <h3 className="text-xl font-semibold mb-4">
    🔋 Hostel Energy Summary
  </h3>

  <p>Total Energy Consumed: {totalEnergy.toFixed(2)} kWh</p>
  <p className="text-green-600">
    Energy Saved by Digital Twin: {(
      Object.values(summary).reduce(
        (a, b) => a + Number(b.energyToday_kWh), 0
      ) * 0.9
    ).toFixed(2)} kWh
  </p>
</div>
      <div className="max-w-5xl mx-auto mt-12">
        {alerts.length > 0 ? (
          <div className="bg-red-100 p-6 rounded-xl text-red-700 font-semibold">
            <h3 className="mb-2 text-xl">⚠️ Alerts</h3>
            {alerts.map((a, i) => (
              <p key={i}>{a}</p>
            ))}
          </div>
        ) : (
          <div className="bg-green-100 p-6 rounded-xl text-green-700 font-semibold">
            No anomalies detected
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center">
      <p className="text-gray-500 mb-2">{title}</p>
      <p className="text-3xl font-bold text-indigo-600">{value}</p>
    </div>
  );
}

