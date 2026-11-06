interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

export function StatCard({ label, value, change, changeType = "neutral", icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${
          changeType === "up" ? "text-green-600" : changeType === "down" ? "text-red-500" : "text-gray-500"
        }`}>
          {changeType === "up" ? "+" : changeType === "down" ? "" : ""}{change}
        </p>
      )}
    </div>
  );
}
