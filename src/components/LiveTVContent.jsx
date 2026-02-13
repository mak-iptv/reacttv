import React, { useMemo } from "react";

function LiveTVContent({
  channels = [],
  selectedCategory = "Të gjitha",
  searchQuery = "",
  onPlay,                    // Ndryshuar nga onSelect në onPlay për konsistencë
  favorites = [],
  isLoading = false         // Shtuar loading state
}) {
  // ✅ SIGURIA ABSOLUTE
  const safeChannels = useMemo(() => {
    if (!Array.isArray(channels)) return [];
    return channels.filter(ch => ch && typeof ch === 'object');
  }, [channels]);

  const safeSearch = useMemo(() => (searchQuery || "").toLowerCase().trim(), [searchQuery]);
  const safeCategory = useMemo(() => selectedCategory || "Të gjitha", [selectedCategory]);

  // ✅ FILTRIMI I OPTIMIZUAR
  const filteredChannels = useMemo(() => {
    return safeChannels.filter((ch) => {
      // Mbrojtje nga undefined/null
      const name = (ch?.name || "").toLowerCase();
      const category = (ch?.category_name || ch?.category || "").toLowerCase();
      
      // Kontrollo kategorinë
      const matchCategory = 
        safeCategory === "Të gjitha" || 
        category === safeCategory.toLowerCase();
      
      // Kontrollo search
      const matchSearch = !safeSearch || 
        name.includes(safeSearch) || 
        category.includes(safeSearch) ||
        (ch?.stream_id?.toString() || "").includes(safeSearch); // Shtuar search nga ID

      return matchCategory && matchSearch;
    });
  }, [safeChannels, safeCategory, safeSearch]);

  // ✅ GRUPIMI SIPAS KATEGORIS (opsionale)
  const groupedChannels = useMemo(() => {
    if (safeCategory !== "Të gjitha") return null;
    
    return filteredChannels.reduce((acc, ch) => {
      const category = ch?.category_name || ch?.category || "Të tjera";
      if (!acc[category]) acc[category] = [];
      acc[category].push(ch);
      return acc;
    }, {});
  }, [filteredChannels, safeCategory]);

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded p-2 animate-pulse">
            <div className="w-full h-28 bg-gray-700 rounded"></div>
            <div className="mt-2 h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ NUK KA KANALE
  if (filteredChannels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
          />
        </svg>
        <p className="text-lg font-medium">Nuk u gjetën kanale</p>
        <p className="text-sm mt-2">Provo të ndryshosh kategorinë ose kërkimin</p>
      </div>
    );
  }

  // ✅ RENDER ME GRUPIM (nëse është "Të gjitha")
  if (groupedChannels && Object.keys(groupedChannels).length > 0) {
    return (
      <div className="space-y-8">
        {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-700">
              {category}
              <span className="ml-2 text-sm text-gray-400">
                ({categoryChannels.length})
              </span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryChannels.map((ch, index) => (
                <ChannelCard 
                  key={ch.stream_id || index}
                  channel={ch}
                  onPlay={onPlay}
                  isFavorite={favorites.includes(ch.stream_id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ RENDER NORMAL (pa grupim)
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredChannels.map((ch, index) => (
        <ChannelCard 
          key={ch.stream_id || index}
          channel={ch}
          onPlay={onPlay}
          isFavorite={favorites.includes(ch.stream_id)}
        />
      ))}
    </div>
  );
}

// ✅ KOMPONENT I NDARË PËR CHANNEL CARD
const ChannelCard = React.memo(({ channel, onPlay, isFavorite }) => {
  const handleClick = () => {
    if (onPlay && channel) {
      onPlay(channel);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      className="bg-gray-800 rounded-lg p-3 cursor-pointer 
                 hover:bg-gray-700 transition-all duration-200 
                 transform hover:scale-105 hover:shadow-lg
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Logo/Image */}
      <div className="relative">
        <img
          src={channel.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name || 'TV')}&size=128&background=2d3748&color=fff`}
          alt={channel.name || 'TV Channel'}
          className="w-full h-28 object-cover rounded-lg bg-gray-900"
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name || 'TV')}&size=128&background=2d3748&color=fff`;
          }}
        />
        
        {/* Favorite Badge */}
        {isFavorite && (
          <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
        
        {/* Now Playing Indicator (nëse është duke u luajtur) */}
        {channel.isPlaying && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
            Duke u luajtur
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="mt-3">
        <h4 className="text-sm font-semibold truncate text-white" title={channel.name}>
          {channel.name || "Pa emër"}
        </h4>
        
        {/* Category */}
        {(channel.category_name || channel.category) && (
          <p className="text-xs text-gray-400 truncate mt-1">
            {channel.category_name || channel.category}
          </p>
        )}
        
        {/* Play Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 
                     text-white text-sm py-1.5 px-3 rounded-md
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Luaj
        </button>
      </div>
    </div>
  );
});

export default LiveTVContent;