import { existsSync } from 'fs';
import fs from 'fs';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { layoutArchitectureNodes } from '@/lib/city-layout';
import { mockArchitectureGraph } from '@/lib/mock-graph';
import type {
  AnalysisFile,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureType,
  BuildingKind,
} from '@/types/architecture';

interface InternalFile extends AnalysisFile {
  absolutePath: string;
  resolvedImports: string[];
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
]);

const TYPE_ORDER: ArchitectureType[] = [
  'database',
  'authentication',
  'middleware',
  'api',
  'service',
  'component',
  'utility',
  'logger',
  'agent',
];

const BUILDING_KIND_MAP: Record<ArchitectureType, BuildingKind> = {
  api: 'tower',
  database: 'vault',
  authentication: 'gate',
  middleware: 'security-wall',
  logger: 'surveillance-hub',
  utility: 'workshop',
  agent: 'drone-bay',
  component: 'block',
  service: 'tower',
};

export async function analyzeRepository(repoUrl: string, force = false): Promise<ArchitectureGraph> {
  const repoName = extractRepoName(repoUrl);

  if (!force) {
    await assertRepoAccessible(repoUrl);
  }

  const workspace = await mkdtemp(path.join(os.tmpdir(), 'project-netrunner-'));
  const repoPath = path.join(workspace, repoName);

  try {
    await git.clone({
      fs,
      http,
      dir: repoPath,
      url: repoUrl,
      depth: 1,
      singleBranch: true,
    });
    await assertSupportedRepository(repoPath);

    const sourcePaths = await collectSourceFiles(repoPath);
    const internalFiles = await analyzeFiles(repoPath, sourcePaths);

    return buildArchitectureGraph(repoUrl, repoName, internalFiles);
  } catch (err) {
    const isAuthError =
      err instanceof Error &&
      /auth|credentials|permission|401|403|404|ENOTFOUND|ECONNREFUSED/i.test(err.message);
    if (force && isAuthError) {
      // ICE bypass failed — return simulated data for the private repo
      return {
        ...mockArchitectureGraph,
        repoUrl,
        repoName,
        generatedAt: new Date().toISOString(),
      };
    }
    throw err;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function assertRepoAccessible(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return;

  const [, owner, repo] = match;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (res.status === 404) {
      throw new Error('ICE: Repository is private or requires authentication.');
    }
    if (!res.ok) {
      throw new Error(`ICE: GitHub API returned ${res.status}. Repository may be private or unavailable.`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('ICE:')) throw err;
    // Network errors: still try cloning, let git handle it
  }
}

function extractRepoName(repoUrl: string) {
  const cleaned = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
  return cleaned.split('/').pop() || 'repository';
}

async function assertSupportedRepository(repoPath: string) {
  const packageJsonPath = path.join(repoPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(
      'Repository is missing package.json. Only JavaScript/TypeScript repositories are supported.'
    );
  }

  // Check that there is at least some TypeScript or JavaScript source to analyze
  const hasTs =
    existsSync(path.join(repoPath, 'tsconfig.json')) ||
    existsSync(path.join(repoPath, 'tsconfig.base.json')) ||
    existsSync(path.join(repoPath, 'jsconfig.json'));
  const hasSrc =
    existsSync(path.join(repoPath, 'src')) ||
    existsSync(path.join(repoPath, 'packages')) ||
    existsSync(path.join(repoPath, 'apps'));

  if (!hasTs && !hasSrc) {
    throw new Error(
      'Could not find TypeScript/JavaScript source files. Only JS/TS repositories are supported.'
    );
  }
}

async function collectSourceFiles(root: string) {
  const files: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        await walk(nextPath);
        continue;
      }

      const extension = path.extname(entry.name);
      if (!SOURCE_EXTENSIONS.has(extension)) {
        continue;
      }

      files.push(nextPath);
    }
  }

  await walk(root);
  return files;
}

async function analyzeFiles(repoRoot: string, sourcePaths: string[]): Promise<InternalFile[]> {
  const normalizedPaths = new Set(
    sourcePaths.map((filePath) => normalizePath(path.relative(repoRoot, filePath)))
  );

  const rawFiles = await Promise.all(
    sourcePaths.map(async (absolutePath) => {
      const relativePath = normalizePath(path.relative(repoRoot, absolutePath));
      const source = await readFile(absolutePath, 'utf8');
      const parsed = inspectSource(source, relativePath);
      const type = classifyArchitecture(relativePath, source);
      const groupKey = deriveGroupKey(relativePath, type);

      const file: InternalFile = {
        id: relativePath,
        absolutePath,
        path: relativePath,
        type,
        imports: parsed.imports,
        dependencyCount: parsed.imports.length,
        exportCount: parsed.exportCount,
        routeCount: parsed.routeCount,
        queryCount: parsed.queryCount,
        groupKey,
        resolvedImports: [],
      };

      return file;
    })
  );

  return rawFiles.map((file) => ({
    ...file,
    resolvedImports: file.imports
      .map((specifier) =>
        resolveInternalImport(specifier, file.absolutePath, repoRoot, normalizedPaths)
      )
      .filter((value): value is string => Boolean(value)),
  }));
}

function inspectSource(source: string, relativePath: string) {
  const imports = new Set<string>();
  let exportCount = 0;
  let routeCount = 0;
  let queryCount = 0;

  const routeMatches = source.match(
    /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g
  );
  if (routeMatches) {
    routeCount += routeMatches.length;
  }

  const queryMatches = source.match(
    /findMany|findUnique|findFirst|create\(|update\(|delete\(|query\(|execute\(|select\(|insert\(|upsert\(/g
  );
  if (queryMatches) {
    queryCount += queryMatches.length;
  }

  try {
    const ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });

    traverse(ast, {
      ImportDeclaration(astPath: any) {
        imports.add(astPath.node.source.value);
      },
      ExportNamedDeclaration(astPath: any) {
        if (astPath.node.source?.value) {
          imports.add(astPath.node.source.value);
        }
        if (astPath.node.declaration || astPath.node.specifiers.length > 0) {
          exportCount += 1;
        }
      },
      ExportDefaultDeclaration() {
        exportCount += 1;
      },
      ExportAllDeclaration(astPath: any) {
        if (astPath.node.source?.value) {
          imports.add(astPath.node.source.value);
        }
        exportCount += 1;
      },
    });
  } catch {
    const importMatches = source.matchAll(/from\s+['\"]([^'\"]+)['\"]/g);
    for (const match of importMatches) {
      imports.add(match[1]);
    }
    exportCount += (source.match(/export\s+/g) || []).length;
  }

  if (relativePath.endsWith('/route.ts') || relativePath.endsWith('/route.tsx')) {
    routeCount = Math.max(routeCount, 1);
  }

  return {
    imports: [...imports],
    exportCount,
    routeCount,
    queryCount,
  };
}

function classifyArchitecture(relativePath: string, source: string): ArchitectureType {
  const loweredPath = relativePath.toLowerCase();
  const loweredSource = source.toLowerCase();

  if (
    loweredPath.includes('/app/api/') ||
    loweredPath.includes('/pages/api/') ||
    loweredPath.endsWith('/route.ts') ||
    loweredPath.endsWith('/route.tsx')
  ) {
    return 'api';
  }

  if (
    loweredPath.includes('middleware') ||
    /nextrequest|nextresponse|koacontext|expressrequest|fastifyrequest/.test(loweredSource)
  ) {
    return 'middleware';
  }

  if (
    /prisma|drizzle|mongoose|sequelize|supabase|database|db\b/.test(loweredPath) ||
    /@prisma\/client|drizzle-orm|mongoose|createclient\(|postgres|mysql|sqlite/.test(loweredSource)
  ) {
    return 'database';
  }

  if (
    /auth|clerk|next-auth|lucia|auth0/.test(loweredPath) ||
    /next-auth|clerk|auth0|lucia|signin|signout|session|authorize/.test(loweredSource)
  ) {
    return 'authentication';
  }

  if (
    /logger|logging|telemetry|sentry/.test(loweredPath) ||
    /winston|pino|logger|captureexception|console\.(log|error|warn)/.test(loweredSource)
  ) {
    return 'logger';
  }

  if (
    /agent|bot|worker|assistant/.test(loweredPath) ||
    /agent|assistant|autonomous/.test(loweredSource)
  ) {
    return 'agent';
  }

  if (/components\//.test(loweredPath) || loweredPath.endsWith('.tsx')) {
    return 'component';
  }

  if (/utils|helpers|lib\//.test(loweredPath)) {
    return 'utility';
  }

  return 'service';
}

function deriveGroupKey(relativePath: string, type: ArchitectureType) {
  const parts = normalizePath(relativePath).split('/');
  const cleaned = ['src', 'app'].includes(parts[0]) ? parts.slice(1) : parts;
  const stem = path.basename(relativePath, path.extname(relativePath));

  if (type === 'api') {
    if (cleaned[0] === 'api') {
      return cleaned[1] || 'api';
    }
    if (cleaned[0] === 'pages' && cleaned[1] === 'api') {
      return cleaned[2] || 'api';
    }
    return cleaned[0] || stem;
  }

  if (type === 'component' && cleaned[0] === 'components') {
    return cleaned[1] || 'components';
  }

  if (cleaned.length > 1) {
    return cleaned[0];
  }

  return stem;
}

function resolveInternalImport(
  specifier: string,
  absolutePath: string,
  repoRoot: string,
  normalizedPaths: Set<string>
) {
  const candidates: string[] = [];

  if (specifier.startsWith('@/')) {
    candidates.push(path.join(repoRoot, 'src', specifier.slice(2)));
  } else if (specifier.startsWith('.')) {
    candidates.push(path.resolve(path.dirname(absolutePath), specifier));
  } else {
    return null;
  }

  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate, repoRoot, normalizedPaths);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function resolveCandidate(candidate: string, repoRoot: string, normalizedPaths: Set<string>) {
  const variants = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    path.join(candidate, 'index.ts'),
    path.join(candidate, 'index.tsx'),
    path.join(candidate, 'route.ts'),
    path.join(candidate, 'route.tsx'),
  ];

  for (const variant of variants) {
    const relative = normalizePath(path.relative(repoRoot, variant));
    if (normalizedPaths.has(relative)) {
      return relative;
    }
  }

  return null;
}

function buildArchitectureGraph(
  repoUrl: string,
  repoName: string,
  files: InternalFile[]
): ArchitectureGraph {
  const nodeMap = new Map<string, Omit<ArchitectureNode, 'position' | 'size'>>();
  const fileToNodeId = new Map<string, string>();

  for (const file of files) {
    const nodeId = `${file.type}:${file.groupKey}`;
    fileToNodeId.set(file.path, nodeId);

    const existing = nodeMap.get(nodeId);
    if (existing) {
      existing.fileCount += 1;
      existing.dependencyCount += file.dependencyCount;
      existing.routeCount += file.routeCount;
      existing.queryCount += file.queryCount;
      existing.files.push(file.path);
      continue;
    }

    nodeMap.set(nodeId, {
      id: nodeId,
      label: humanizeLabel(file.groupKey),
      type: file.type,
      buildingKind: BUILDING_KIND_MAP[file.type],
      path: path.dirname(file.path) === '.' ? file.path : path.dirname(file.path),
      fileCount: 1,
      dependencyCount: file.dependencyCount,
      routeCount: file.routeCount,
      queryCount: file.queryCount,
      files: [file.path],
    });
  }

  const edgeWeights = new Map<string, number>();

  for (const file of files) {
    const sourceNodeId = fileToNodeId.get(file.path);
    if (!sourceNodeId) {
      continue;
    }

    for (const importedPath of file.resolvedImports) {
      const targetNodeId = fileToNodeId.get(importedPath);
      if (!targetNodeId || targetNodeId === sourceNodeId) {
        continue;
      }

      const key = `${sourceNodeId}->${targetNodeId}`;
      edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
    }
  }

  const fragmentedNodes = fragmentLargeNodes([...nodeMap.values()], fileToNodeId);
  const positionedNodes = layoutNodes(fragmentedNodes);
  const edges = [...edgeWeights.entries()].map(([key, weight]) => {
    const [source, target] = key.split('->');
    return { source, target, weight };
  });

  return {
    repoUrl,
    repoName,
    generatedAt: new Date().toISOString(),
    stats: {
      totalFiles: files.length,
      totalNodes: positionedNodes.length,
      totalEdges: edges.length,
    },
    nodes: positionedNodes,
    edges,
  };
}

const FRAGMENT_THRESHOLD = 150;
const FRAGMENT_CHUNK = 50;

function fragmentLargeNodes(
  nodes: Omit<ArchitectureNode, 'position' | 'size'>[],
  fileToNodeId: Map<string, string>
): Omit<ArchitectureNode, 'position' | 'size'>[] {
  const result: Omit<ArchitectureNode, 'position' | 'size'>[] = [];

  for (const node of nodes) {
    if (node.fileCount <= FRAGMENT_THRESHOLD) {
      result.push(node);
      continue;
    }

    // Split files into chunks
    const chunks: string[][] = [];
    for (let i = 0; i < node.files.length; i += FRAGMENT_CHUNK) {
      chunks.push(node.files.slice(i, i + FRAGMENT_CHUNK));
    }

    chunks.forEach((chunk, idx) => {
      const fragmentId = idx === 0 ? node.id : `${node.id}__frag${idx}`;
      const fragmentNode: Omit<ArchitectureNode, 'position' | 'size'> = {
        ...node,
        id: fragmentId,
        label: idx === 0 ? node.label : `${node.label} ${idx + 1}`,
        fileCount: chunk.length,
        dependencyCount: Math.round(node.dependencyCount * (chunk.length / node.fileCount)),
        routeCount: Math.round(node.routeCount * (chunk.length / node.fileCount)),
        queryCount: Math.round(node.queryCount * (chunk.length / node.fileCount)),
        files: chunk,
      };
      // Remap file→node pointers for edge resolution
      chunk.forEach((f) => fileToNodeId.set(f, fragmentId));
      result.push(fragmentNode);
    });
  }

  return result;
}

function layoutNodes(nodes: Omit<ArchitectureNode, 'position' | 'size'>[]): ArchitectureNode[] {
  return layoutArchitectureNodes(
    nodes.map((node) => ({
      ...node,
      size: calculateSize(node),
    }))
  );
}

function calculateSize(
  node: Omit<ArchitectureNode, 'position' | 'size'>
): [number, number, number] {
  const fc = Math.min(node.fileCount, 40); // cap file contribution
  const rc = Math.min(node.routeCount, 20); // cap route contribution
  const qc = Math.min(node.queryCount, 16); // cap query contribution
  const dc = Math.min(node.dependencyCount, 30); // cap dep contribution
  const MAX_H = 72; // absolute height ceiling

  switch (node.type) {
    case 'api':
      return [
        12 + Math.min(rc * 0.35, 7),
        Math.min(MAX_H, 28 + rc * 1.8 + fc * 0.7 + dc * 0.35),
        12 + Math.min(rc * 0.35, 7),
      ];
    case 'database':
      return [
        22 + Math.min(qc * 0.7, 12),
        Math.min(MAX_H, 20 + qc * 1.3 + fc * 0.55),
        22 + Math.min(qc * 0.7, 12),
      ];
    case 'authentication':
      return [12, Math.min(MAX_H, 34 + fc * 1.25 + dc * 0.55), 7];
    case 'middleware':
      return [30 + Math.min(fc * 1.1, 16), Math.min(MAX_H, 16 + fc * 0.75 + dc * 0.35), 6];
    case 'logger':
      return [14, Math.min(MAX_H, 26 + dc * 0.9 + fc * 0.45), 14];
    case 'utility':
      return [10, Math.min(MAX_H, 16 + fc * 0.8 + dc * 0.35), 10];
    case 'agent':
      return [13, Math.min(MAX_H, 42 + dc * 1.05 + fc * 0.55), 13];
    case 'component':
      return [
        16 + Math.min(fc * 0.28, 8),
        Math.min(MAX_H, 24 + fc * 0.9 + dc * 0.28),
        16 + Math.min(fc * 0.28, 8),
      ];
    default:
      return [14, Math.min(MAX_H, 26 + dc * 0.8 + fc * 0.45), 14];
  }
}

function humanizeLabel(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/');
}
