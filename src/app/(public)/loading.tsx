export default function PublicLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-wash border-t-navy rounded-full animate-spin" />
        <span className="text-[13px] text-muted font-medium">Načítání...</span>
      </div>
    </div>
  );
}
