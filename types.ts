
export interface Annotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number];
  area: number;
  iscrowd: number;
}

export interface ImageInfo {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface InstancesData {
  info?: {
    description: string;
  };
  images: ImageInfo[];
  annotations: Annotation[];
  categories: Category[];
}

export interface PromptData {
  image_id: string;
  prompt: string;
}

export interface ParsedOrders {
  targets: string[];
  protected: string[];
}

export interface Detection {
  id: number;
  class_id: number;
  species: string;
  bbox: [number, number, number, number]; // pixel values [x, y, w, h]
  bboxNormalized?: [number, number, number, number]; // normalized [ymin, xmin, ymax, xmax]
  confidence: number;
  isTarget: boolean;
  isProtected: boolean;
  aimPoint?: Coordinate;
}

export type Coordinate = [number, number];

export interface Score {
  hits: number;
  misses: number;
  collateral: number;
  total: number;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export enum GameStatus {
  Idle = 'Idle',
  Parsing = 'Parsing Orders...',
  Detecting = 'Detecting Targets...',
  Generating = 'Generating Coordinates...',
  Ready = 'Ready to Engage',
  Simulating = 'Simulating Engagement...',
  Done = 'Mission Complete',
}
