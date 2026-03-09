import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function BlockEnergyChart({ data }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md mt-10">
      <h3 className="font-bold mb-4">⚡ Energy Load Over Time</h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="time" hide />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="powerW" stroke="#6366f1" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
