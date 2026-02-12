import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="pt-24 bg-gray-50">

      {/* Banner — controlled height */}
      <div className="max-w-6xl mx-auto px-6">
        <img
          src="/hostel1.jpg"
          className="w-full h-[320px] object-cover rounded-2xl shadow-lg"
        />
      </div>

      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mt-12">
        Welcome to GHS Twin!
      </h1>

      <p className="text-center text-gray-600 mt-3">
        Smart Digital Twin Dashboard for Hostel Energy Monitoring
      </p>

      {/* Cards container — centered + limited width */}
      <div className="max-w-4xl mx-auto flex justify-center gap-10 mt-12 px-6">

        <Link to="/boys">
          <HostelCard
            title="Boys Hostel"
            img="/boys_hostel.webp"
          />
        </Link>

        <Link to="/girls">
          <HostelCard
            title="Girls Hostel"
            img="/girls_hostel.webp"
          />
        </Link>

      </div>

    </div>
  );
}

function HostelCard({ title, img }) {
  return (
    <div className="
     w-[260px]
      bg-white
      rounded-2xl
      shadow-lg
      overflow-hidden
      hover:shadow-2xl
      hover:-translate-y-1
      transition
      duration-300
    ">

      <img
        src={img}
        className="w-full h-[170px] object-cover"
      />

      <div className="p-5 text-center text-lg font-semibold">
        {title}
      </div>

    </div>
  );
}
