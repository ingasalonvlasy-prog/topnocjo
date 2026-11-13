interface TimelineItemProps {
  event: {
    id: string;
    type: string;
    title: string;
    detail: string | null;
    createdAt: Date;
    userId: string | null;
  };
}

const EVENT_COLORS: Record<string, string> = {
  status_change: "bg-blue-500",
  payment: "bg-green-500",
  email_sent: "bg-purple-500",
  email_failed: "bg-red-500",
  comment: "bg-gray-700",
  tracking: "bg-indigo-500",
  note: "bg-yellow-500",
  supplier: "bg-orange-500",
  system: "bg-gray-400",
};

function formatEventTime(date: Date): string {
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimelineItem({ event }: TimelineItemProps) {
  const dotColor = EVENT_COLORS[event.type] || EVENT_COLORS.system;
  const detail = event.detail ? JSON.parse(event.detail) : null;

  return (
    <div className="flex gap-3 pl-4 py-3 relative">
      <div className={`absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-900">
            {event.type === "comment" && detail?.text ? (
              <span className="whitespace-pre-wrap">{detail.text}</span>
            ) : (
              event.title
            )}
          </p>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {formatEventTime(event.createdAt)}
          </span>
        </div>

        {event.type === "email_sent" && detail && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>&rarr; {detail.to}</span>
            {detail.resendId && (
              <span className="font-mono text-gray-400">#{detail.resendId.slice(0, 8)}</span>
            )}
          </div>
        )}

        {event.type === "payment" && detail?.transId && (
          <div className="mt-1 text-xs text-gray-500">
            <span className="font-mono">Comgate: {detail.transId}</span>
          </div>
        )}

        {event.type === "status_change" && detail && (
          <div className="mt-1 text-xs text-gray-500">
            {detail.from} &rarr; {detail.to}
          </div>
        )}

        {event.type === "tracking" && detail?.trackingUrl && (
          <a
            href={detail.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800"
          >
            Sledovat zásilku &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
