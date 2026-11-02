import { useState, type ReactNode } from "react";
import { move, removeAt, replaceAt } from "../lib/utils";

const inputCls =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500";
const smallBtn =
  "rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string | null;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value ?? ""}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-y`}
    />
  );
}

/** Saisie de tags : Entrée ou virgule pour ajouter, Retour arrière pour retirer le dernier. */
export function TagInput({
  values,
  onChange,
  placeholder = "Ajouter (Entrée ou virgule)",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s, i, arr) => s && !values.includes(s) && arr.indexOf(s) === i);
    if (items.length) onChange([...values, ...items]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-gray-300 p-1.5 focus-within:border-gray-900">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs">
          {v}
          <button
            type="button"
            aria-label={`Retirer ${v}`}
            onClick={() => onChange(removeAt(values, i))}
            className="text-gray-500 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        className="min-w-32 flex-1 px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-500 hover:text-gray-900"
    >
      + {children}
    </button>
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${smallBtn} hover:text-red-600`}>
      Supprimer
    </button>
  );
}

export function ItemToolbar({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" aria-label="Monter" className={smallBtn} disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button
        type="button"
        aria-label="Descendre"
        className={smallBtn}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
      <RemoveButton onClick={onRemove} />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** Liste d'éléments réordonnables (expériences, projets, formations…). */
export function ListSection<T>({
  title,
  items,
  getKey,
  onChange,
  createItem,
  addLabel,
  renderItem,
}: {
  title: string;
  items: T[];
  getKey: (item: T, index: number) => string;
  onChange: (items: T[]) => void;
  createItem: () => T;
  addLabel: string;
  renderItem: (item: T, update: (next: T) => void) => ReactNode;
}) {
  return (
    <Section title={title}>
      {items.length === 0 && <p className="text-sm text-gray-500">Aucun élément.</p>}
      {items.map((item, i) => (
        <div key={getKey(item, i)} className="space-y-3 rounded border border-gray-200 bg-gray-50/60 p-3">
          <div className="flex justify-end">
            <ItemToolbar
              index={i}
              count={items.length}
              onMove={(dir) => onChange(move(items, i, dir))}
              onRemove={() => {
                if (window.confirm("Supprimer cet élément ?")) onChange(removeAt(items, i));
              }}
            />
          </div>
          {renderItem(item, (next) => onChange(replaceAt(items, i, next)))}
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, createItem()])}>{addLabel}</AddButton>
    </Section>
  );
}