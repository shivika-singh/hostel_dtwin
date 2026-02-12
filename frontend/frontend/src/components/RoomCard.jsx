import { motion } from "framer-motion";

export default function RoomCard({ room }) {
  return (
    <motion.div
      whileHover={{ scale: 1.06 }}
      className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 w-72 border border-gray-200"
    >
      <h3 className="text-2xl font-bold mb-3">
        Room {room.id}
      </h3>

      <div className="space-y-1 text-gray-700">
        <p>Occupancy: <b>{room.occupied ? "Occupied" : "Empty"}</b></p>
        <p>Light: <b>{room.light ? "ON" : "OFF"}</b></p>
        <p>Fan: <b>{room.fan ? "ON" : "OFF"}</b></p>
      </div>

      <div className="mt-4 text-lg font-semibold text-indigo-600">
        Power: {room.power} W
      </div>
    </motion.div>
  );
}
