interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Font {
  name: string;
  family: string;
  weight: "normal" | "bold";
  style: "normal" | "italic";
  size: number;
}

interface Line {
  wmode: number;
  bbox: BoundingBox;
  font: Font;
  x: number;
  y: number;
  text: string;
}

interface Block {
  type: "text";
  bbox: BoundingBox;
  lines: Line[];
}

export interface DocumentStructure {
  blocks: Block[];
}
