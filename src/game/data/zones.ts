/**
 * Zone definitions for the stitched Mauville + Routes map.
 *
 * Stitched map is 140x120 tiles:
 *   Route 117 (west):  x < 50
 *   Route 118 (east):  x >= 90
 *   Route 110 (south): y >= 70
 *   Route 111 (north): y < 50
 *   Mauville City:     50 <= x < 90, 50 <= y < 70
 *
 * Music IDs match the OG game:
 *   Mauville City → MUS_RUSTBORO (mus_mauville.ogg in our files)
 *   Route 110/111/117 → MUS_ROUTE110 (mus_route110.ogg)
 *   Route 118 → MUS_ROUTE110 west half / MUS_ROUTE119 east half
 *               (we use mus_route111.ogg for variety)
 *
 * Popup themes (OG map_popup):
 *   Cities → marble
 *   Routes → wood
 */

export interface ZoneDef {
  id: string;
  name: string;
  /** BGM track key (matches BGMManager TRACK_MAP) */
  music: string;
  /** Popup box theme: "marble" for cities, "wood" for routes */
  popupTheme: "marble" | "wood";
  /** Check if a tile position is inside this zone */
  contains: (x: number, y: number) => boolean;
}

export const ZONES: ZoneDef[] = [
  {
    id: "mauville",
    name: "MAUVILLE CITY",
    music: "mauville",
    popupTheme: "marble",
    contains: (x, y) => x >= 50 && x < 90 && y >= 50 && y < 70,
  },
  {
    id: "route117",
    name: "ROUTE 117",
    music: "route",
    popupTheme: "wood",
    contains: (x, y) => x < 50 && y >= 50 && y < 70,
  },
  {
    id: "route118",
    name: "ROUTE 118",
    music: "route118",
    popupTheme: "wood",
    contains: (x, y) => x >= 90 && y >= 50 && y < 70,
  },
  {
    id: "route110",
    name: "ROUTE 110",
    music: "route",
    popupTheme: "wood",
    contains: (x, y) => y >= 70,
  },
  {
    id: "route111",
    name: "ROUTE 111",
    music: "route",
    popupTheme: "wood",
    contains: (x, y) => y < 50,
  },
];

/** Get the zone for a tile position. */
export function getZoneAt(x: number, y: number): ZoneDef | undefined {
  return ZONES.find((z) => z.contains(x, y));
}
