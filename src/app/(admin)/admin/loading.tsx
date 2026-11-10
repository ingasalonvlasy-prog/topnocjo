export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <span className="text-[13px] text-gray-500 font-medium">Načítání...</span>
      </div>
    </div>
  );
}
