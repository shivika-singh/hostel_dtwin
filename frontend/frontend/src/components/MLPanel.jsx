export default function MLPanel() {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm">

      <h3 className="text-xl font-semibold mb-4 text-indigo-700">
        AI Prediction Insights
      </h3>

      <div className="space-y-3 text-sm">

        <Row label="Predicted Low Usage Window" value="2:30 PM – 4:00 PM" />
        <Row label="Auto Switch-Off Suggested" value="Yes" />
        <Row label="Estimated Energy Saving" value="18%" />
        <Row label="Model Confidence" value="0.87" />

      </div>

    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
