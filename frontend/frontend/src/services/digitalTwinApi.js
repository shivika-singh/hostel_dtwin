export async function fetchDigitalTwinState() {
  const res = await fetch("http://localhost:5001/digitalTwinState");
  if (!res.ok) {
    throw new Error("Failed to fetch Digital Twin state");
  }
  return res.json();
}
