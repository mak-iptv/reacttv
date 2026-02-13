import React from "react";

function SeriesContent({ 
  series = [], 
  isLoading = false, 
  onPlay 
}) {
  // ✅ SIGURI ABSOLUTE
  const safeSeries = React.useMemo(() => {
    if (!Array.isArray(series)) return [];
    return series.filter(s => s && typeof s === 'object');
  }, [series]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 animate-pulse">
            <div className="w-full h-48 bg-gray-700 rounded-lg"></div>
            <div className="mt-3 h-5 bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (safeSeries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className="text-lg font-medium">Nuk u gjetën seriale</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
      {safeSeries.map((serie, index) => {
        if (!serie) return null;
        
        const key = serie.series_id || serie.id || index;
        const title = serie.name || serie.title || serie.series_name || "Pa titull";
        const cover = serie.cover || serie.poster || serie.thumbnail ||
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=300&background=2d3748&color=fff`;
        const seasons = serie.seasons || serie.season_count || 0;
        const rating = serie.rating || serie.imdb_rating || "";

        return (
          <SeriesCard
            key={key}
            serie={serie}
            title={title}
            cover={cover}
            seasons={seasons}
            rating={rating}
            onPlay={onPlay}
          />
        );
      })}
    </div>
  );
}

const SeriesCard = React.memo(({ serie, title, cover, seasons, rating, onPlay }) => {
  const handlePlay = () => {
    if (onPlay && serie) {
      onPlay(serie);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePlay}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handlePlay()}
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer 
                 hover:bg-gray-700 transition-all duration-300 
                 transform hover:scale-105 hover:shadow-xl"
    >
      <div className="relative">
        <img
          src={cover}
          alt={title}
          className="w-full h-48 object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=300&background=2d3748&color=fff`;
          }}
        />
        
        {rating && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            ⭐ {rating}
          </div>
        )}
        
        {seasons > 0 && (
          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            {seasons} {seasons === 1 ? 'Sezon' : 'Sezone'}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate" title={title}>
          {title}
        </h3>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
          className="mt-3 w-full bg-green-600 hover:bg-green-700 
                     text-white text-sm py-2 px-4 rounded-md"
        >
          Shiko Seriale
        </button>
      </div>
    </div>
  );
});

export default SeriesContent;