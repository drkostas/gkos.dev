export function CurrentlyPlayingBentoReact() {
  const track = {
    title: "The Sun Yet Shines",
    artist: "Bear McCreary",
    artistId: "2ifvIECHAlEgPMBuBOJ0lG",
    albumName: "The Lord of the Rings: The Rings of Power",
    albumId: "2Oe6kYDU9YQhun0YrXL9eV",
    albumImageUrl: "https://i.scdn.co/image/ab67616d0000b2735cf2a1df961de6e7d7d3c113",
    songUrl: "https://open.spotify.com/track/5hcRWT88VLlbhEMh4efCMy",
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border-primary bg-bg-primary p-6 hover:bg-white overflow-hidden h-[300px]">
      <div className="user-select-none pointer-events-none absolute inset-0 z-30 bg-gradient-to-tl from-indigo-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      <div className="flex flex-col">
        <div className="z-10 h-full">
          <div className="flex h-full flex-col justify-between">
            <h2 className="mb-2 text-base font-medium text-text-primary">Recent Favorite</h2>
            <p className="max-h-[150px] overflow-hidden text-base text-text-secondary">
              <span className="line-clamp-4 text-ellipsis">
                I'm listening to{" "}
                <a className="font-semibold" href={track.songUrl}>{track.title}</a>{" "}
                by{" "}
                <a className="font-semibold" href={`https://open.spotify.com/artist/${track.artistId}`}>{track.artist}</a>{" "}
                from the album{" "}
                <a className="font-semibold" href={`https://open.spotify.com/album/${track.albumId}`}>{track.albumName}</a>
              </span>
            </p>
          </div>
          {/* Vinyl record that slides up on hover */}
          <div className="user-select-none pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 group-hover:-bottom-1">
            <svg width="179" height="171" viewBox="0 0 179 171" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin-slow">
              <circle cx="89.5" cy="104.5" r="89.5" fill="#3C3C3F" />
              <circle cx="89.501" cy="104.5" r="87.06" stroke="#6C6D70" strokeWidth="1.3" />
              <circle cx="89.4992" cy="104.5" r="80.3" stroke="#4D4E52" strokeWidth="0.5" />
              <circle cx="89.4995" cy="104.5" r="69.56" stroke="#4D4E52" strokeWidth="0.5" />
              <circle cx="89.5012" cy="104.5" r="57.26" stroke="#4D4E52" strokeWidth="0.5" />
              {/* Album art circle */}
              <clipPath id="vinyl-clip">
                <circle cx="89.5" cy="104.5" r="30" />
              </clipPath>
              <image
                href={track.albumImageUrl}
                x="59.5" y="74.5" width="60" height="60"
                clipPath="url(#vinyl-clip)"
                preserveAspectRatio="xMidYMid slice"
              />
              <circle cx="89.5" cy="104.5" r="8" fill="#3C3C3F" />
              <circle cx="89.5" cy="104.5" r="3" fill="#6C6D70" />
            </svg>
          </div>
          {/* Album cover underneath */}
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2">
            <div
              className="h-[210px] w-[210px] rounded-sm bg-cover bg-center shadow-md"
              style={{ backgroundImage: `url(${track.albumImageUrl})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
