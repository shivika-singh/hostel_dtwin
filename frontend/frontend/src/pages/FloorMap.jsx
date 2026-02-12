import { useEffect, useState } from "react";

export default function FloorMap() {
  const [twin, setTwin] = useState(null);

  useEffect(() => {
    const fetchTwin = async () => {
      const res = await fetch("http://localhost:5000/digitalTwinState");
      const data = await res.json();
      setTwin(data.blocks);
    };

    fetchTwin();
    const interval = setInterval(fetchTwin, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!twin) {
    return <div className="pt-28 text-center">Loading Digital Twin…</div>;
  }

  return (
    <div className="pt-28 px-10">
      <h2 className="text-4xl font-bold text-center mb-12">
        Digital Twin Map — All Blocks
      </h2>

      {Object.entries(twin).map(([blockId, block]) => (
        <div key={blockId} className="mb-12">
          <h3 className="text-2xl font-semibold mb-4">
            Block {blockId}
          </h3>

          <div className="grid grid-cols-5 gap-4">
            {Object.entries(block.rooms).map(([roomId, room]) => {
              const color = room.wastage
                ? "bg-red-300"
                : room.inferredOccupancy === "OCCUPIED"
                ? "bg-green-300"
                : "bg-gray-300";

              return (
                <div
                  key={roomId}
                  className={`p-4 rounded-xl text-center font-semibold ${color}`}
                >
                  {roomId}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
