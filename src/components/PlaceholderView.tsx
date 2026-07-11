interface PlaceholderViewProps {
  title: string;
}

export default function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
      <p className="text-slate-600 mt-4">Vue placeholder — migration React Phase 1</p>
    </div>
  );
}
