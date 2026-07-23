import type { DecorationData } from "@/lib/game/mapScene";

export type MapElementCatalogItem = {
  id: string;
  label: string;
  src: string;
  defaultWidth: number;
  anchor?: DecorationData["anchor"];
};

/** Dekoracje dostępne w edytorze mapy (`/levels?edit=1`). */
export const MAP_ELEMENT_CATALOG: MapElementCatalogItem[] = [
  {
    id: "girl_signpost",
    label: "Girl signpost",
    src: "/map/elements/girl_signpost.png",
    defaultWidth: 140,
    anchor: "bottom-center",
  },
  {
    id: "king_crown",
    label: "King crown",
    src: "/map/elements/king_crown.png",
    defaultWidth: 120,
    anchor: "bottom-center",
  },
  {
    id: "knight_shield",
    label: "Knight shield",
    src: "/map/elements/knight_shield.png",
    defaultWidth: 130,
    anchor: "bottom-center",
  },
  {
    id: "ork_stone",
    label: "Ork stone",
    src: "/map/elements/ork_stone.png",
    defaultWidth: 150,
    anchor: "bottom-center",
  },
  {
    id: "sage_book",
    label: "Sage book",
    src: "/map/elements/sage_book.png",
    defaultWidth: 120,
    anchor: "bottom-center",
  },
  {
    id: "trader_goods",
    label: "Trader goods",
    src: "/map/elements/trader_goods.png",
    defaultWidth: 140,
    anchor: "bottom-center",
  },
  {
    id: "worker_tools",
    label: "Worker tools",
    src: "/map/elements/worker_tools.png",
    defaultWidth: 130,
    anchor: "bottom-center",
  },
];

/** Starsze dekoracje z `public/map/decor/` — opcjonalnie w edytorze. */
export const MAP_DECOR_CATALOG: MapElementCatalogItem[] = [
  {
    id: "bush",
    label: "Bush",
    src: "/map/decor/bush.png",
    defaultWidth: 131,
    anchor: "bottom-center",
  },
  {
    id: "flowers",
    label: "Flowers",
    src: "/map/decor/flowers.png",
    defaultWidth: 105,
    anchor: "center",
  },
  {
    id: "grass",
    label: "Grass",
    src: "/map/decor/grass.png",
    defaultWidth: 100,
    anchor: "bottom-center",
  },
  {
    id: "latern",
    label: "Lantern",
    src: "/map/decor/latern.png",
    defaultWidth: 83,
    anchor: "bottom-center",
  },
  {
    id: "smaller_rocks",
    label: "Rocks",
    src: "/map/decor/smaller_rocks.png",
    defaultWidth: 110,
    anchor: "center",
  },
  {
    id: "tree",
    label: "Tree",
    src: "/map/decor/tree.png",
    defaultWidth: 166,
    anchor: "bottom-center",
  },
];

export const MAP_EDITOR_CATALOG = [...MAP_ELEMENT_CATALOG, ...MAP_DECOR_CATALOG];
