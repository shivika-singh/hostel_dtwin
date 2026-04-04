import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="fixed top-0 w-full bg-white shadow z-50">
      <div className="max-w-6xl mx-auto flex justify-between p-4">

        <h1 className="font-bold text-xl text-indigo-600">
          <b>GHS Twin</b>
        </h1>

        <div className="space-x-5 flex items-center text-sm">
          <Link to="/" className="text-gray-600 hover:text-indigo-600">Home</Link>
          <Link to="/admin" className="text-gray-600 hover:text-indigo-600">Dashboard</Link>
          <Link to="/map" className="text-gray-600 hover:text-indigo-600">Twin Map</Link>
          <Link to="/boys" className="text-gray-600 hover:text-indigo-600">Boys</Link>
          <Link to="/girls" className="text-gray-600 hover:text-indigo-600">Girls</Link>
          <Link to="/simulation" className="text-gray-600 hover:text-indigo-600"> Simulate</Link>
          <Link to="/comparison" className="text-gray-600 hover:text-indigo-600">Compare</Link>
          <Link to="/safety" className="text-gray-600 hover:text-indigo-600">Safety</Link>
          <Link to="/prediction" className= "text-gray-600 hover:text-indigo-600">Predict</Link>
        </div>

      </div>
    </div>
  );
}
