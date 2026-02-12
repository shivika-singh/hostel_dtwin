import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="fixed top-0 w-full bg-white shadow z-50">
      <div className="max-w-6xl mx-auto flex justify-between p-4">

        <h1 className="font-bold text-xl text-indigo-600">
          <b>GHS Twin</b>
        </h1>

        <div className="space-x-6">
          <Link to="/">Home</Link>
          <Link to="/admin">Dashboard</Link>
          <Link to="/map">Twin Map</Link>
          <Link to="/boys">Boys</Link>
          <Link to="/girls">Girls</Link>
        </div>

      </div>
    </div>
  );
}
