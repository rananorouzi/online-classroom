"use client";

import { useState, useRef, useEffect } from "react";

export interface PersonOption {
  id: string;
  name: string | null;
  email: string;
}

interface PersonDropdownProps {
  value: string;
  onChange: (id: string) => void;
  options: PersonOption[];
  placeholder: string;
}

export default function PersonDropdown({
  value,
  onChange,
  options,
  placeholder,
}: PersonDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.name || "").toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-left transition hover:border-zinc-600 focus:border-gold/50 focus:outline-none cursor-pointer"
      >
        <span className={selected ? "text-primary" : "text-zinc-500"}>
          {selected
            ? `${selected.name || selected.email} (${selected.email})`
            : placeholder}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40">
          <div className="border-b border-zinc-700/50 p-2">
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-primary placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-600">No results found</p>
            ) : (
              filtered.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    onChange(person.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition cursor-pointer ${
                    person.id === value
                      ? "bg-gold/10 text-gold"
                      : "text-primary hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold text-xs font-semibold">
                    {(person.name || person.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person.name || "Unnamed"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {person.email}
                    </p>
                  </div>
                  {person.id === value && (
                    <svg className="h-4 w-4 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
