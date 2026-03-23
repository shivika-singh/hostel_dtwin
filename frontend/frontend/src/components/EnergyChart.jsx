import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";

export default function EnergyChart({ blockId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchEnergy = async () => {
      const res = await fetch(`http://localhost:5001/energyAnalytics/${blockId}`);
      const json = await res.json();

      const formatted = json.energyTimeline.map(p => ({
        time: new Date(p.time).toLocaleTimeString(),
        power: p.powerW
      }));

      setData(formatted.slice(-20));
    };

    fetchEnergy();
    const i = setInterval(fetchEnergy, 3000);
    return () => clearInterval(i);
  }, [blockId]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="font-semibold mb-3">⚡ Energy Load – Block {blockId}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis unit="W" />
          <Tooltip />
          <Line type="monotone" dataKey="power" stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
