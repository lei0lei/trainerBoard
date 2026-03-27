import type { ContextMenuItem, LGraphNode } from "litegraph.js";
import type { LitegraphNodeSelection } from "../../core/types";

export type LitegraphNodeCatalogItem = {
  type: string;
  label: string;
  category: string;
  description: string;
};

export const litegraphNodeCatalog: LitegraphNodeCatalogItem[] = [
  {
    type: "trainer/checkpoint",
    label: "Checkpoint Loader",
    category: "Loaders",
    description: "Select a base checkpoint or training preset.",
  },
  {
    type: "trainer/prompt",
    label: "Prompt",
    category: "Conditioning",
    description: "Edit positive and negative prompts.",
  },
  {
    type: "trainer/number",
    label: "Number",
    category: "Inputs",
    description: "Numeric value node for graph parameters.",
  },
  {
    type: "trainer/text",
    label: "Text",
    category: "Inputs",
    description: "Simple string input node.",
  },
  {
    type: "trainer/preview",
    label: "Preview",
    category: "Outputs",
    description: "Display incoming values in a preview panel.",
  },
];

let registered = false;

function buildNodeMenuOptions(this: LGraphNode): ContextMenuItem[] {
  const node = this;
  return [
    {
      content: "Duplicate Node",
      callback: () => {
        node.graph?.beforeChange(node);
        const clone = node.clone();
        clone.pos = [node.pos[0] + 36, node.pos[1] + 36];
        node.graph?.add(clone);
        node.graph?.afterChange(node);
      },
    },
    {
      content: "Delete Node",
      callback: () => {
        node.graph?.beforeChange(node);
        node.graph?.remove(node);
        node.graph?.afterChange(node);
      },
    },
  ];
}

export function registerTrainerLitegraphNodes(litegraphModule: typeof import("litegraph.js")) {
  if (registered) return;

  const { LiteGraph, LGraphNode } = litegraphModule;

  class CheckpointNode extends LGraphNode {
    override properties = { checkpoint: "sdxl-base" };

    constructor() {
      super();
      this.title = "Checkpoint Loader";
      this.addOutput("MODEL", "model");
      this.addWidget("combo", "checkpoint", this.properties.checkpoint, (value) => {
        this.properties.checkpoint = String(value);
      }, {
        values: ["sdxl-base", "flux-dev", "trainer-small"],
      });
      this.size = [220, 88];
    }

    override onExecute() {
      this.setOutputData(0, { checkpoint: this.properties.checkpoint });
    }

    override getMenuOptions() {
      return buildNodeMenuOptions.call(this);
    }
  }

  class PromptNode extends LGraphNode {
    override properties = {
      positive: "high detail portrait, cinematic light",
      negative: "low quality, blurry",
    };

    constructor() {
      super();
      this.title = "Prompt";
      this.addOutput("POSITIVE", "string");
      this.addOutput("NEGATIVE", "string");
      this.addWidget("text", "positive", this.properties.positive, (value) => {
        this.properties.positive = String(value);
      });
      this.addWidget("text", "negative", this.properties.negative, (value) => {
        this.properties.negative = String(value);
      });
      this.size = [280, 116];
    }

    override onExecute() {
      this.setOutputData(0, this.properties.positive);
      this.setOutputData(1, this.properties.negative);
    }

    override getMenuOptions() {
      return buildNodeMenuOptions.call(this);
    }
  }

  class NumberNode extends LGraphNode {
    override properties = { value: 7.5 };

    constructor() {
      super();
      this.title = "Number";
      this.addOutput("VALUE", "number");
      this.addWidget("number", "value", this.properties.value, (value) => {
        this.properties.value = Number(value);
      }, {
        precision: 2,
      });
      this.size = [180, 80];
    }

    override onExecute() {
      this.setOutputData(0, this.properties.value);
    }

    override getMenuOptions() {
      return buildNodeMenuOptions.call(this);
    }
  }

  class TextNode extends LGraphNode {
    override properties = { value: "trainerboard" };

    constructor() {
      super();
      this.title = "Text";
      this.addOutput("TEXT", "string");
      this.addWidget("text", "value", this.properties.value, (value) => {
        this.properties.value = String(value);
      });
      this.size = [220, 82];
    }

    override onExecute() {
      this.setOutputData(0, this.properties.value);
    }

    override getMenuOptions() {
      return buildNodeMenuOptions.call(this);
    }
  }

  class PreviewNode extends LGraphNode {
    override properties = { value: "Nothing connected" };

    constructor() {
      super();
      this.title = "Preview";
      this.addInput("INPUT", "*");
      this.size = [260, 104];
    }

    override onExecute() {
      const incoming = this.getInputData(0);
      this.properties.value =
        incoming === undefined
          ? "Nothing connected"
          : typeof incoming === "object"
            ? JSON.stringify(incoming, null, 2)
            : String(incoming);
    }

    override onDrawBackground(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = "#101010";
      ctx.fillRect(8, 34, this.size[0] - 16, this.size[1] - 42);
      ctx.fillStyle = "#4fc1ff";
      ctx.font = "12px sans-serif";

      const lines = String(this.properties.value).split(/\r?\n/).slice(0, 4);
      lines.forEach((line, index) => {
        ctx.fillText(line, 14, 54 + index * 16);
      });
    }

    override getMenuOptions() {
      return buildNodeMenuOptions.call(this);
    }
  }

  LiteGraph.registerNodeType("trainer/checkpoint", CheckpointNode);
  LiteGraph.registerNodeType("trainer/prompt", PromptNode);
  LiteGraph.registerNodeType("trainer/number", NumberNode);
  LiteGraph.registerNodeType("trainer/text", TextNode);
  LiteGraph.registerNodeType("trainer/preview", PreviewNode);

  registered = true;
}

export function createDefaultTrainerGraph(litegraphModule: typeof import("litegraph.js")) {
  const { LiteGraph, LGraph } = litegraphModule;
  const graph = new LGraph();

  const checkpoint = LiteGraph.createNode("trainer/checkpoint");
  const prompt = LiteGraph.createNode("trainer/prompt");
  const preview = LiteGraph.createNode("trainer/preview");

  checkpoint.pos = [80, 80];
  prompt.pos = [380, 70];
  preview.pos = [730, 90];

  graph.add(checkpoint);
  graph.add(prompt);
  graph.add(preview);

  prompt.connect(0, preview, 0);

  return graph.serialize() as Record<string, unknown>;
}

export function extractLitegraphSelection(node: LGraphNode | null): LitegraphNodeSelection {
  if (!node) {
    return {
      id: null,
      title: null,
      type: null,
      properties: {},
    };
  }

  const properties = Object.entries((node.properties ?? {}) as Record<string, unknown>).reduce<
    Record<string, string | number | boolean | null>
  >((acc, [key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return {
    id: node.id ?? null,
    title: node.title || node.type || "Node",
    type: node.type ?? null,
    properties,
  };
}


