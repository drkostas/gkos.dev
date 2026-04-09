/**
 * generate-map.mjs
 *
 * Creates a Tiled-format JSON map (20x15 tiles, 16x16 each).
 * Three layers:
 *   "Ground"    — grass (tile 1) everywhere
 *   "World"     — walls (tile 2) on the border, 0 elsewhere
 *   "Collision" — same wall positions, with ge_collide property for Grid Engine
 *
 * Output: public/game/maps/mauville.json
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/game/maps/mauville.json");

const W = 20;
const H = 15;
const TILE_SIZE = 16;

const GRASS = 1; // tile index 1 (Tiled uses 1-based GIDs)
const WALL = 2; // tile index 2

// Build layer data arrays
const ground = [];
const world = [];
const collision = [];

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Ground: grass everywhere
    ground.push(GRASS);

    // Border check
    const isBorder = x === 0 || x === W - 1 || y === 0 || y === H - 1;

    // World: wall on border, 0 inside
    world.push(isBorder ? WALL : 0);

    // Collision: same as world (non-zero = blocked)
    collision.push(isBorder ? WALL : 0);
  }
}

const map = {
  compressionlevel: -1,
  height: H,
  infinite: false,
  layers: [
    {
      data: ground,
      height: H,
      id: 1,
      name: "Ground",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
    {
      data: world,
      height: H,
      id: 2,
      name: "World",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
    {
      data: collision,
      height: H,
      id: 3,
      name: "Collision",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: W,
      x: 0,
      y: 0,
      properties: [
        {
          name: "ge_collide",
          type: "bool",
          value: true,
        },
      ],
    },
  ],
  nextlayerid: 4,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.10.2",
  tileheight: TILE_SIZE,
  tilewidth: TILE_SIZE,
  tilesets: [
    {
      columns: 2,
      firstgid: 1,
      image: "../tilesets/placeholder-tiles.png",
      imageheight: TILE_SIZE,
      imagewidth: TILE_SIZE * 2,
      margin: 0,
      name: "placeholder-tiles",
      spacing: 0,
      tilecount: 2,
      tileheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
    },
  ],
  type: "map",
  version: "1.10",
  width: W,
};

writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`Map written to ${outPath} (${W}x${H} tiles)`);
