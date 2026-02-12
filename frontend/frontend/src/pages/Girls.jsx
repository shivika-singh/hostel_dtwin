import { Link } from "react-router-dom";

export default function Girls() {
  return (
    <div className="pt-28 bg-gray-50 min-h-screen">

      {/* Title */}
      <h2 className="text-4xl font-bold text-center mb-12">
        Girls Hostel Blocks
      </h2>

      {/* Cards container */}
      <div className="max-w-4xl mx-auto flex justify-center gap-10">

        <Link to="/block/G1">
          <BlockCard name="Block G1" />
        </Link>

        <Link to="/block/G2">
          <BlockCard name="Block G2" />
        </Link>

      </div>

    </div>
  );
}

function BlockCard({ name }) {
  return (
    <div className="w-60 bg-white rounded-xl shadow-lg p-8 text-center text-xl font-semibold hover:shadow-2xl hover:-translate-y-1 transition cursor-pointer">
      {name}
    </div>
  );
}


