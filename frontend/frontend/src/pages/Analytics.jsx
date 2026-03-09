export default function Analytics() {
  return (
    <div className="pt-28 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">IoT Sensor Analytics</h2>

      <iframe
        src="https://thingspeak.com/channels/YOUR_CHANNEL_ID/charts/3"
        width="100%"
        height="300"
      />

      <p className="mt-4 text-gray-600">
        Raw temperature and CO₂ data from IoT sensors (ThingSpeak)
      </p>
    </div>
  );
}
