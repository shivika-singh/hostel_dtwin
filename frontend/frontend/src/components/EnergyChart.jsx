export default function EnergyChart({ blockData }) {
  if (!blockData) {
    return <div className="text-center text-gray-500">Loading energy data...</div>;
  }

  const total = blockData.energy.currentLoad;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">⚡ Block Energy Load</h3>

      <div className="text-3xl font-bold text-blue-600">
        {total} W
      </div>

      <p className="text-sm text-gray-500 mt-2">
        Real-time aggregated load from room-level Digital Twin
      </p>
    </div>
  );
}
