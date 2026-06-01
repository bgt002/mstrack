import Link from "next/link";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[#0b0f1acc] border-b border-border">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-indigo-500 text-[#0b0f1a] font-black text-lg shadow-lg">
            M
          </span>
          <span className="font-extrabold text-lg tracking-tight">
            Maple<span className="text-accent">Tracker</span>
          </span>
        </Link>
        <span className="text-xs text-muted hidden sm:block">
          Boss crystal tracker · saved in your browser
        </span>
      </div>
    </header>
  );
}
