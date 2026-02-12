import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "9AM", energy: 2.1 },
  { time: "10AM", energy: 2.8 },
  { time: "11AM", energy: 3.5 },
  { time: "12PM", energy: 4.2 },
  { time: "1PM", energy: 3.6 },
  { time: "2PM", energy: 2.9 },
];

export default function ChartsPanel() {
  return (
    <div className="py-16">

      <h2 className="text-4xl font-bold text-center mb-10">
        Energy Usage Trend
      </h2>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="energy" stroke="#6366f1" />
          </LineChart>
        </ResponsiveContainer>

      </div>

    </div>
  );
}
