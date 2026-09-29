/** Set a path only after adding the file under public/. See docs/visual-assets.md. */
export const visualAssets: {
  backgroundImages: string[];
  clipboardTexture: string | null;
  decorations: { slot: "plant" | "cloud" | "desk"; src: string | null }[];
} = {
  backgroundImages: [
    "/images/backgrounds/cocoon-bg-01.jpg",
    "/images/backgrounds/cocoon-bg-02.jpg",
    "/images/backgrounds/cocoon-bg-03.jpg",
    "/images/backgrounds/cocoon-bg-04.jpg",
    "/images/backgrounds/cocoon-bg-05.jpg",
    "/images/backgrounds/cocoon-bg-06.jpg",
    "/images/backgrounds/cocoon-bg-07.jpg",
    "/images/backgrounds/cocoon-bg-08.jpg",
  ],
  clipboardTexture: "/images/clipboard-texture.jpg",
  decorations: [
    { slot: "plant", src: null }, // "/images/decor/pixel-plant.png"
    { slot: "cloud", src: null }, // "/images/decor/pixel-cloud.png"
    { slot: "desk", src: null }, // "/images/decor/pixel-desk-object.png"
  ],
};
