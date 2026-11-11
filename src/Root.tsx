import React from "react";
import { Composition } from "remotion";
import { GroceryShort } from "./videos/grocery/Storee";
import { TOTAL, FPS } from "./videos/grocery/story";

// 1080 x 1920 vertical; `npm run render` upscales x1.3333 to 1440 x 2560 (every post parameter scales with the output size).
export const Root: React.FC = () => (
  <Composition id="GroceryShort" component={GroceryShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
