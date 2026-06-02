type StatCardProps = {
  title: string;
  value: string | number;
  helper?: string;
};

export function StatCard({ title, value, helper }: StatCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </article>
  );
}
