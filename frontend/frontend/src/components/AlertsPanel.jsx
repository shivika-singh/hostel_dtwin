import { useContext } from "react";
import { EnergyContext } from "../context/EnergyContext";

export default function AlertsPanel() {
  const { roomState, roomEnergy } = useContext(EnergyContext);

  const alerts = [];

  Object.entries(roomState).forEach(([roomId, state]) => {
    const energy = roomEnergy[roomId] || 0;

    if (!state.occupied && state.light) {
      alerts.push(`Room ${roomId}: Light ON while empty`);
    }

    if (!state.occupied && state.fan) {
      alerts.push(`Room ${roomId}: Fan ON while empty`);
    }

    if (energy > 2.2) {
      alerts.push(`Room ${roomId}: High energy usage`);
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-700">
          No anomalies detected
        </h3>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">

      <h3 className="font-semibold text-red-700 mb-3">
        Smart Alerts
      </h3>

      <ul className="space-y-2 text-sm">
        {alerts.map((a, i) => (
          <li key={i} className="text-red-600">
            ⚠ {a}
          </li>
        ))}
      </ul>

    </div>
  );
}
