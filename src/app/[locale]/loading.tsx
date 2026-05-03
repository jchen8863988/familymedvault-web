export default function LocaleLoading() {
  return (
    <div
      className="mx-auto max-w-6xl flex-1 px-6 py-12"
      aria-busy
      aria-label="Loading"
    >
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-44 rounded-lg bg-slate-200" />
        <div className="h-4 max-w-xl rounded bg-slate-100" />
        <div className="h-4 max-w-lg rounded bg-slate-100" />
        <div className="h-4 max-w-md rounded bg-slate-100" />
      </div>
    </div>
  );
}
