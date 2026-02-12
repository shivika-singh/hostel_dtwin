import { useParams } from "react-router-dom";
import { useState } from "react";
import { useContext } from "react";
import { EnergyContext } from "../context/EnergyContext";
import { useEffect } from "react";



export default function Room() {
  const { id } = useParams();
  const { updateRoomEnergy } = useContext(EnergyContext);

  // 🔹 interactive simulated sensor state
  const { roomState, updateRoomState } = useContext(EnergyContext);

 const saved = roomState[id] || {
  occupied: false,
  light: false,
  fan: false
};

 const [occupied, setOccupied] = useState(saved.occupied);
 const [light, setLight] = useState(saved.light);
 const [fan, setFan] = useState(saved.fan);


  const energy = (0.5 + (light ? 1 : 0) + (fan ? 1.2 : 0)).toFixed(2);
  useEffect(() => {
  updateRoomEnergy(id, Number(energy));
 }, [energy, id]);
 
  useEffect(() => {
  updateRoomState(id, { occupied, light, fan });
}, [occupied, light, fan, id]);



  return (
    <div className="pt-28 bg-gray-50 min-h-screen">

      <h2 className="text-4xl font-bold text-center mb-12">
        Room {id} Control Panel
      </h2>

      <div className="max-w-md mx-auto space-y-6">

        <ToggleCard
          label="Occupancy"
          value={occupied}
          onToggle={() => setOccupied(!occupied)}
        />

        <ToggleCard
          label="Light"
          value={light}
          onToggle={() => setLight(!light)}
        />

        <ToggleCard
          label="Fan"
          value={fan}
          onToggle={() => setFan(!fan)}
        />

        <InfoCard
          label="Estimated Energy"
          value={`${energy} kWh`}
        />

      </div>

    </div>
  );
}

function ToggleCard({ label, value, onToggle }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex justify-between items-center">

      <span className="font-semibold text-lg">
        {label}
      </span>

      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-full font-semibold transition ${
          value
            ? "bg-green-500 text-white"
            : "bg-gray-300 text-gray-700"
        }`}
      >
        {value ? "ON" : "OFF"}
      </button>

    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex justify-between items-center">

      <span className="font-semibold text-lg">
        {label}
      </span>

      <span className="px-4 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
        {value}
      </span>

    </div>
  );
}
