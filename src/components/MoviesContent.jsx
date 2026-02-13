import React from "react";

function MoviesContent({ 
  movies = [], 
  isLoading = false, 
  onPlay 
}) {
  // ✅ SIGURI ABSOLUTE - FILTER PËR UNDEFINED
  const safeMovies = React.useMemo(() => {
    if (!Array.isArray(movies)) return [];
    return movies.filter(movie => movie && typeof movie === 'object');
  }, [movies]);

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 animate-pulse">
            <div className="w-full h-48 bg-gray-700 rounded-lg"></div>
            <div className="mt-3 h-5 bg-gray-700 rounded w-3/4"></div>
            <div className="mt-2 h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ NUK KA FILMA
  if (safeMovies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" 
          />
        </svg>
        <p className="text-lg font-medium">Nuk u gjetën filma</p>
        <p className="text-sm mt-2">Filmat do të shfaqen këtu</p>
      </div>
    );
  }

  // ✅ RENDER FILMAT
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
      {safeMovies.map((movie, index) => {
        // ✅ KONTROLLO QË MOVIE EKZISTON
        if (!movie) return null;
        
        // ✅ PËRDOR ID NËSE KA, PËRNDRYSHE INDEX
        const key = movie.stream_id || movie.id || movie.movie_id || index;
        const title = movie.name || movie.title || movie.movie_name || "Pa titull";
        const poster = movie.poster || movie.cover || movie.poster_url || movie.thumbnail || 
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=300&background=2d3748&color=fff`;
        const year = movie.year || movie.release_date || "";
        const rating = movie.rating || movie.imdb_rating || "";

        return (
          <MovieCard
            key={key}
            movie={movie}
            title={title}
            poster={poster}
            year={year}
            rating={rating}
            onPlay={onPlay}
          />
        );
      })}
    </div>
  );
}

// ✅ KOMPONENT I VEÇANTË PËR MOVIE CARD
const MovieCard = React.memo(({ movie, title, poster, year, rating, onPlay }) => {
  const handlePlay = () => {
    if (onPlay && movie) {
      onPlay(movie);
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
                 transform hover:scale-105 hover:shadow-xl
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Poster */}
      <div className="relative">
        <img
          src={poster}
          alt={title}
          className="w-full h-48 object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=300&background=2d3748&color=fff`;
          }}
        />
        
        {/* Rating Badge */}
        {rating && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            ⭐ {rating}
          </div>
        )}
        
        {/* Year Badge */}
        {year && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {year}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate" title={title}>
          {title}
        </h3>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 
                     text-white text-sm py-2 px-4 rounded-md
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Luaj Filmin
        </button>
      </div>
    </div>
  );
});

export default MoviesContent;