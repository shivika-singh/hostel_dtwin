module.exports = function inferRoomState(room) {
  let inferredOccupancy = "EMPTY";

  if (room.occupancy === 1) {
    inferredOccupancy = "OCCUPIED";
  } else if (room.co2 > 800) {
    inferredOccupancy = "OCCUPIED";
  }

  let wastage = false;
  if (inferredOccupancy === "EMPTY" && (room.light === 1 || room.fan === 1)) {
    wastage = true;
  }

  return {
    inferredOccupancy,
    wastage
  };
};
