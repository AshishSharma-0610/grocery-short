import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
// first load of the bundle compiles a few hundred canvases: be patient
Config.setDelayRenderTimeoutInMilliseconds(120000);
