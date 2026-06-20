export type ArchitectureType =
  | 'api'
  | 'database'
  | 'authentication'
  | 'middleware'
  | 'logger'
  | 'utility'
  | 'agent'
  | 'component'
  | 'service';

export type BuildingKind =
  | 'tower'
  | 'vault'
  | 'gate'
  | 'security-wall'
  | 'surveillance-hub'
  | 'workshop'
  | 'drone-bay'
  | 'block';

export interface AnalysisFile {
  id: string;
  path: string;
  type: ArchitectureType;
  imports: string[];
  dependencyCount: number;
  exportCount: number;
  routeCount: number;
  queryCount: number;
  groupKey: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: ArchitectureType;
  buildingKind: BuildingKind;
  path: string;
  fileCount: number;
  dependencyCount: number;
  routeCount: number;
  queryCount: number;
  position: [number, number, number];
  size: [number, number, number];
  files: string[];
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  weight: number;
}

export interface ArchitectureGraph {
  repoUrl: string;
  repoName: string;
  generatedAt: string;
  stats: {
    totalFiles: number;
    totalNodes: number;
    totalEdges: number;
  };
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
