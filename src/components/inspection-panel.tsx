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
  if (!node) {
    return (
      <aside className='panel flex min-h-[320px] flex-col justify-between p-5 lg:min-h-[420px]'>
        <div className='space-y-4'>
          <span className='data-chip'>Node Scanner</span>
          <div className='space-y-2'>
            <p className='hud-title'>Awaiting lock</p>
            <h2 className='text-2xl font-semibold text-white'>No structure selected</h2>
            <p className='max-w-sm text-sm leading-6 text-slate-300'>
              Click a structure inside the city grid to inspect its architecture class, file
              density, and dependency surface.
            </p>
          </div>
        </div>
        <div className='panel-muted space-y-3 p-4 text-sm text-slate-300'>
          <div className='flex items-center justify-between'>
            <span>WASD</span>
            <span className='text-cyan-200'>Move</span>
          </div>
          <div className='flex items-center justify-between'>
            <span>Drag</span>
            <span className='text-cyan-200'>Mouse look</span>
          </div>
          <div className='flex items-center justify-between'>
            <span>Scroll</span>
            <span className='text-cyan-200'>Zoom</span>
          </div>
          <div className='flex items-center justify-between'>
            <span>Click</span>
            <span className='text-cyan-200'>Inspect</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className='panel flex min-h-[320px] flex-col gap-5 p-5 lg:min-h-[420px]'>
      <div className='space-y-3'>
        <span className='data-chip'>{typeLabels[node.type]}</span>
        <div>
          <p className='hud-title'>Inspection Target</p>
          <h2 className='text-2xl font-semibold text-white'>{node.label}</h2>
          <p className='mt-2 text-sm leading-6 text-slate-300'>{node.path}</p>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3 text-sm'>
        <MetricCard label='Files' value={node.fileCount} />
        <MetricCard label='Dependencies' value={node.dependencyCount} />
        <MetricCard label='Routes' value={node.routeCount} />
        <MetricCard label='Queries' value={node.queryCount} />
      </div>

      <div className='panel-muted space-y-4 p-4'>
        <div className='grid grid-cols-2 gap-3 text-sm'>
          <MetaLine label='System Class' value={typeLabels[node.type]} />
          <MetaLine label='District Path' value={node.path} />
        </div>
      </div>

      <div className='panel-muted flex-1 p-4'>
        <p className='hud-title mb-3'>Included Files</p>
        <div className='space-y-2 text-sm text-slate-200'>
          {node.files.slice(0, 8).map((filePath) => (
            <div key={filePath} className='rounded-xl border border-white/5 bg-white/5 px-3 py-2'>
              {filePath}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className='panel-muted p-4'>
      <p className='hud-title'>{label}</p>
      <p className='mt-2 text-2xl font-semibold text-cyan-100'>{value}</p>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='hud-title'>{label}</p>
      <p className='mt-2 text-sm leading-6 text-slate-200'>{value}</p>
    </div>
  );
}
