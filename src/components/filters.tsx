import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { LINES } from '../lib/mockData';
import { useStore } from '../lib/store';

export function FilterSelect({ value, onChange, options, placeholder, className = 'w-[150px]' }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-9 bg-card text-sm ${className}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function LineSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <FilterSelect value={value} onChange={onChange} options={[{ value: 'all', label: 'All lines' }, ...LINES.map((l) => ({ value: l.id, label: l.name }))]} className="w-[130px]" />;
}

export function StationSelect({ value, onChange, line = 'all' }: { value: string; onChange: (v: string) => void; line?: string }) {
  const { stations } = useStore();
  const opts = stations.filter((s) => line === 'all' || s.lineId === line);
  return <FilterSelect value={value} onChange={onChange} options={[{ value: 'all', label: 'All stations' }, ...opts.map((s) => ({ value: s.id, label: s.name }))]} className="w-[170px]" />;
}

export const chartTooltip = {
  contentStyle: { borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12, boxShadow: 'var(--shadow-md)' },
};

export const C = {
  c1: 'hsl(var(--chart-1))', c2: 'hsl(var(--chart-2))', c3: 'hsl(var(--chart-3))', c4: 'hsl(var(--chart-4))', c5: 'hsl(var(--chart-5))',
  grid: 'hsl(var(--border))', muted: 'hsl(var(--muted-foreground))',
};
