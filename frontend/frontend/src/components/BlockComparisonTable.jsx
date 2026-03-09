export default function BlockComparisonTable({ summary }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-10">
      <h3 className="text-xl font-bold mb-4">🏢 Block Energy Comparison</h3>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Block</th>
            <th className="p-2">Energy Today (kWh)</th>
            <th className="p-2">Current Load (W)</th>
            <th className="p-2">Occupied Rooms</th>
            <th className="p-2">Wastage Rooms</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(summary).map(([block, data]) => (
            <tr key={block} className="text-center border-t">
              <td className="p-2 font-semibold">{block}</td>
              <td className="p-2">{data.energyToday_kWh}</td>
              <td className="p-2">{data.currentLoad_W}</td>
              <td className="p-2">{data.occupiedRooms}</td>
              <td className="p-2 text-red-600 font-bold">
                {data.wastageRooms}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
