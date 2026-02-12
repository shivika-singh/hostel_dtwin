export default function Gallery() {
  return (
    <div id="gallery" className="py-16 bg-gray-50">

      <h2 className="text-4xl font-bold text-center mb-10">
        Good Host Spaces
      </h2>

  <div className="flex justify-center gap-6 flex-wrap">

  {/* Girls Hostel Card */}
  <div className="w-[260px] rounded-xl overflow-hidden shadow-lg group">

    <img
      src="/girls_hostel.webp"
      alt="Girls Hostel"
      className="w-full h-[180px] object-cover transition-transform duration-500 group-hover:scale-110"
    />

    <div className="bg-white text-center py-3 font-semibold">
      Girls Hostel
    </div>

  </div>


  {/* Boys Hostel Card */}
  <div className="w-[260px] rounded-xl overflow-hidden shadow-lg group">

    <img
      src="/boys_hostel.webp"
      alt="Boys Hostel"
      className="w-full h-[180px] object-cover transition-transform duration-500 group-hover:scale-110"
    />

    <div className="bg-white text-center py-3 font-semibold">
      Boys Hostel
    </div>

  </div>

</div>

    </div>
  );
}
