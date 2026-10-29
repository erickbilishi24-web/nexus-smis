import { ChevronRight, Home } from "lucide-react";

export type WorkspaceBreadcrumbItem = { label: string; onClick?: () => void };

export function WorkspaceBreadcrumbs({ items }: { items: WorkspaceBreadcrumbItem[] }) {
  return <nav aria-label="Breadcrumb" className="mb-3 flex min-w-0 items-center gap-1.5 overflow-x-auto text-[.68rem] font-semibold text-[#718077]">
    <Home size={13} className="shrink-0 text-[#1d6a57]" aria-hidden="true" />
    {items.map((item, index) => <span key={`${item.label}-${index}`} className="flex min-w-0 shrink-0 items-center gap-1.5">
      {index > 0 && <ChevronRight size={12} className="shrink-0 text-[#a1afa5]" aria-hidden="true" />}
      {item.onClick ? <button type="button" onClick={item.onClick} className="truncate rounded px-1 py-0.5 text-[#1d6a57] transition-colors hover:bg-[#e8f3eb] hover:underline" title={`Go to ${item.label}`}>{item.label}</button> : <span className="truncate text-[#426158]" aria-current="page">{item.label}</span>}
    </span>)}
  </nav>;
}
