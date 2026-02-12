export default function MetricsPanel() {
  return (
    <div className="py-12">

      <h2 className="text-3xl font-bold text-center mb-8">
        Digital Twin Metrics
      </h2>

      <div className="flex flex-wrap justify-center gap-6">

        <MetricCard title="Total Rooms" value="24" color="bg-blue-500" />
        <MetricCard title="Active Rooms" value="17" color="bg-green-500" />
        <MetricCard title="Energy Usage" value="3.2 kWh" color="bg-orange-500" />
        <MetricCard title="Energy Saved" value="28%" color="bg-purple-500" />

      </div>

    </div>
  );
}

function MetricCard({ title, value, color }) {
  return (
    <div className="w-[220px] bg-white rounded-xl shadow-md p-6 border">

      <div className={`w-3 h-3 rounded-full ${color} mb-3`}></div>

      <h3 className="text-gray-600 text-sm">
        {title}
      </h3>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>

    </div>
  );
}
