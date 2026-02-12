import { useEffect, useState } from "react";

export default function Admin() {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("http://localhost:5000/wardenSummary");
      const data = await res.json();
      setSummary(data);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  let totalEnergy = 0;
  let occupiedRooms = 0;
  let activeRooms = 0;
  let alerts = [];

  Object.values(summary).forEach(block => {
    totalEnergy += block.currentLoad;
    occupiedRooms += block.occupiedRooms;
    activeRooms += block.wastageRooms;
    alerts = alerts.concat(block.alerts);
  });

  return (
    <div className="pt-28 bg-gray-50 min-h-screen">
      <h2 className="text-4xl font-bold text-center mb-12">
        Warden Dashboard
      </h2>

      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8">
        <Metric title="Total Energy Today" value={`${(totalEnergy/1000).toFixed(2)} kWh`} />
        <Metric title="Active Rooms" value={activeRooms} />
        <Metric title="Occupied Rooms" value={occupiedRooms} />
      </div>

      <div className="max-w-5xl mx-auto mt-12">
        {alerts.length > 0 ? (
          <div className="bg-red-100 p-6 rounded-xl text-red-700 font-semibold">
            {alerts.map((a, i) => (
              <p key={i}>⚠️ {a}</p>
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
