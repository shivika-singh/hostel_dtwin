export default function Hero() {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden">

      <img
        src="/hostel1.jpg"
        className="w-full h-full object-cover scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/40 flex flex-col justify-center items-center text-white text-center">

        <h1 className="text-6xl font-extrabold mb-6 tracking-wide">
          Smart Digital Twin Hostel
        </h1>

        <p className="text-xl max-w-2xl opacity-90">
          AI-Driven Energy Monitoring & Optimization Platform
        </p>

        <div className="mt-8 px-6 py-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
          Research Grade Digital Twin Dashboard
        </div>

      </div>
    </div>
  );
}
