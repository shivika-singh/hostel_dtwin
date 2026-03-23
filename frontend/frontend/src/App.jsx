import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Boys from "./pages/Boys";
import Girls from "./pages/Girls";
import Block from "./pages/Block";
import Room from "./pages/Room";
import Admin from "./pages/Admin";
import FloorMap from "./pages/FloorMap";
import Simulation from "./pages/Simulation";




export default function App() {
  return (
    <div className="bg-gray-100 min-h-screen">

      {/* Top Navbar */}
      <Navbar />

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boys" element={<Boys />} />
        <Route path="/girls" element={<Girls />} />
        <Route path="/block/:id" element={<Block />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/map" element={<FloorMap />} />
        <Route path="/simulation" element={<Simulation />} />




      </Routes>

    </div>
  );
}
