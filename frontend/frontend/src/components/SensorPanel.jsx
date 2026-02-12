export default function SensorPanel() {
  return (
    <div id="sensors" className="py-16">

      <h2 className="text-4xl font-bold text-center mb-10">
        Sensor Status Panel
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">

        <SensorCard title="Temperature" value="26°C" />
        <SensorCard title="CO₂ Level" value="540 ppm" />
        <SensorCard title="Humidity" value="62%" />
        <SensorCard title="Light Intensity" value="320 lux" />

      </div>

    </div>
  );
}

function SensorCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 text-center border">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-2xl font-bold text-indigo-600 mt-2">{value}</p>
    </div>
  );
}
