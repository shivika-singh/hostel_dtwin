import { useEffect, useState } from "react";
import { fetchDigitalTwinState } from "../services/digitalTwinApi";
import { useParams, Link } from "react-router-dom";
import EnergyChart from "../components/EnergyChart";
import MLPanel from "../components/MLPanel";



export default function Block() {
  const { id } = useParams();
const [blockData, setBlockData] = useState(null);
useEffect(() => {
  let interval;

  const loadData = async () => {
    try {
      const data = await fetchDigitalTwinState();
      setBlockData(data.blocks[id]);
    } catch (err) {
      console.error(err);
    }
  };

  loadData(); // initial fetch

  interval = setInterval(loadData, 2000); // every 2 seconds

  return () => clearInterval(interval);
}, [id]);


  return (
    <div className="pt-28 bg-gray-50 min-h-screen">

      <h2 className="text-4xl font-bold text-center mb-12">
        {id} Rooms
      </h2>

      {/* Room Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-5 gap-6">

        {[...Array(10)].map((_, i) => (
          <Link key={i} to={`/room/${id}-${i+1}`}>
            <RoomCard
  number={i+1}
  data={blockData?.rooms[`${id}-${i+1}`]}
/>

          </Link>
        ))}

      </div>
      <div className="max-w-4xl mx-auto mt-16">
  <EnergyChart blockId={id} />


</div>
<div className="max-w-4xl mx-auto mt-8">
  <MLPanel />
</div>

    </div>
  );
}

function RoomCard({ number, data }) {
  const occupied = data?.inferredOccupancy === "OCCUPIED";


  return (
    <div
      className={`rounded-xl shadow-md p-6 text-center font-semibold transition
      ${occupied ? "bg-green-100" : "bg-red-100"}`}
    >
      Room {number}
      <div className="text-sm mt-2">
        {occupied ? "Occupied" : "Empty"}
      </div>
      {data && (
        <div className="text-xs mt-2 text-gray-600">
          🌡 {data.temperature}°C | CO₂ {data.co2}
        </div>
      )}
    </div>
  );
}

