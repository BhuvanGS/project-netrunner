import { useEffect, useRef, useState } from 'react';
import type { ArchitectureNode } from '@/types/architecture';

interface InspectionPanelProps {
  node: ArchitectureNode | null;
}

const typeLabels: Record<ArchitectureNode['type'], string> = {
  api: 'API Service',
  database: 'Database',
  authentication: 'Authentication',
  middleware: 'Middleware',
  logger: 'Logger',
  utility: 'Utility Module',
  agent: 'Agent System',
  component: 'Component Cluster',
  service: 'Service',
};

export function InspectionPanel({ node }: InspectionPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevNodeId = useRef<string | null>(null);

  // Auto-expand when a new building is selected
  useEffect(() => {
    if (node && node.id !== prevNodeId.current) {
      setIsCollapsed(false);
    }
    prevNodeId.current = node?.id ?? null;
  }, [node]);

  const showPanel = !!node && !isCollapsed;

  return (
    <>
      {/* Slide-in panel */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-[380px] transition-transform duration-500 ease-out ${
          showPanel ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='flex h-full flex-col border-r border-red-500/20 bg-[#05080e]/95 backdrop-blur-md p-5 font-mono text-sm'>
          {!node ? (
            <div className='flex flex-1 flex-col justify-between'>
              <div className='space-y-4'>
                <span className='inline-block rounded border border-red-500/30 bg-red-950/20 px-2 py-1 text-[10px] uppercase tracking-wider text-red-300'>
                  Node Scanner
                </span>
                <div className='space-y-2'>
                  <p className='text-[10px] uppercase tracking-wider text-red-400/40'>
                    Awaiting lock
                  </p>
                  <h2 className='text-xl font-semibold text-white'>No structure selected</h2>
                  <p className='text-xs leading-5 text-slate-400'>
                    Click a structure inside the city grid to inspect its architecture class, file
                    density, and dependency surface.
                  </p>
                </div>
              </div>
              <div className='space-y-3 rounded border border-red-500/10 bg-red-950/10 p-4 text-xs text-slate-400'>
                <div className='flex items-center justify-between'>
                  <span>WASD</span>
                  <span className='text-red-300'>Move</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Drag</span>
                  <span className='text-red-300'>Mouse look</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Scroll</span>
                  <span className='text-red-300'>Zoom</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Click</span>
                  <span className='text-red-300'>Inspect</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className='space-y-3 border-b border-red-500/10 pb-4'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='inline-block rounded border border-red-500/30 bg-red-950/20 px-2 py-1 text-[10px] uppercase tracking-wider text-red-300'>
                    {typeLabels[node.type]}
                  </span>
                  <button
                    onClick={() => setIsCollapsed(true)}
                    className='rounded border border-red-500/20 bg-red-950/20 px-2 py-1 text-[10px] text-red-300 transition hover:border-red-500/40 hover:text-red-100'
                    title='Collapse panel'
                  >
                    [×]
                  </button>
                </div>
                <div>
                  <p className='text-[10px] uppercase tracking-wider text-red-400/40'>
                    Inspection Target
                  </p>
                  <h2 className='mt-1 text-lg font-semibold text-white leading-tight'>
                    {node.label}
                  </h2>
                  <p className='mt-1 text-xs leading-5 text-red-200/50 break-all'>{node.path}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className='grid grid-cols-2 gap-2 py-4'>
                <MetricCard label='Files' value={node.fileCount} />
                <MetricCard label='Dependencies' value={node.dependencyCount} />
                <MetricCard label='Routes' value={node.routeCount} />
                <MetricCard label='Queries' value={node.queryCount} />
              </div>

              {/* Meta */}
              <div className='space-y-3 rounded border border-red-500/10 bg-red-950/10 p-3 text-xs'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-red-400/40 shrink-0'>System Class</span>
                  <span className='text-red-200/70 text-right break-all'>
                    {typeLabels[node.type]}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-red-400/40 shrink-0'>District Path</span>
                  <span className='text-red-200/70 text-right break-all'>{node.path}</span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-red-400/40 shrink-0'>Building ID</span>
                  <span className='text-red-200/70 font-mono text-[10px]'>
                    {node.id.slice(0, 8)}…
                  </span>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-red-400/40 shrink-0'>Position</span>
                  <span className='text-red-200/70 font-mono text-[10px]'>
                    {node.position[0].toFixed(1)}, {node.position[2].toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Files */}
              <div className='mt-4 flex-1 overflow-hidden min-h-0'>
                <p className='mb-2 text-[10px] uppercase tracking-wider text-red-400/40'>
                  Included Files
                </p>
                <div className='h-full overflow-y-auto space-y-1.5 pb-4'>
                  {node.files.map((filePath) => (
                    <div
                      key={filePath}
                      className='rounded border border-red-500/10 bg-red-950/10 px-2.5 py-1.5 text-[11px] text-red-200/60 break-all'
                    >
                      {filePath}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle tab — visible when panel is hidden and a node exists */}
      {node && isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className='fixed left-0 top-1/2 z-50 -translate-y-1/2 rounded-r border border-red-500/20 border-l-0 bg-[#05080e]/95 backdrop-blur-md px-2 py-4 text-[10px] font-mono uppercase tracking-wider text-red-300 transition hover:text-red-100'
          title='Open scanner'
        >
          <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>▶ Scanner</span>
        </button>
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded border border-red-500/10 bg-red-950/10 p-3'>
      <p className='text-[10px] uppercase tracking-wider text-red-400/40'>{label}</p>
      <p className='mt-1 text-xl font-semibold text-red-100'>{value}</p>
    </div>
  );
}
