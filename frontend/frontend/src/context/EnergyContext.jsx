import { createContext, useState } from "react";

export const EnergyContext = createContext();

export function EnergyProvider({ children }) {
  const [roomEnergy, setRoomEnergy] = useState({});
  const [roomState, setRoomState] = useState({});

  function updateRoomEnergy(roomId, value) {
    setRoomEnergy(prev => ({
      ...prev,
      [roomId]: value
    }));
  }

  function updateRoomState(roomId, state) {
    setRoomState(prev => ({
      ...prev,
      [roomId]: state
    }));
  }

  return (
    <EnergyContext.Provider
      value={{
        roomEnergy,
        updateRoomEnergy,
        roomState,
        updateRoomState
      }}
    >
      {children}
    </EnergyContext.Provider>
  );
}
