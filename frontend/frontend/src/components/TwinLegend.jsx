export default function TwinLegend() {
  return (
    <div className="flex gap-6 mt-6 text-sm">
      <Legend color="bg-green-400" label="Occupied (Normal)" />
      <Legend color="bg-yellow-400" label="Occupied (High Power)" />
      <Legend color="bg-red-400" label="Empty + Devices ON" />
      <Legend color="bg-gray-300" label="Idle" />
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${color}`}></div>
      <span>{label}</span>
    </div>
  );
}
