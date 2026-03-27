import { plugin as explorer } from "./explorer";
import { plugin as extensions } from "./extensions";
import { plugin as extensionsDetection } from "./extensions/detection";
import { plugin as litegraph } from "./litegraph";
import { plugin as run } from "./run";
import { plugin as search } from "./search";
import { plugin as sourceControl } from "./source-control";

export const workbenchPlugins = [
  explorer,
  extensions,
  extensionsDetection,
  litegraph,
  run,
  search,
  sourceControl,
];
