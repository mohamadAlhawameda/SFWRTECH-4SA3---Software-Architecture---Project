"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8000";

type Expense = {
  id: number;
  amount: number;
  currency: string;
  amount_base: number;
  base_currency: string;
  category: string;
  description: string | null;
  spent_at: string;   // ISO date
  created_at: string; // ISO datetime
};

type SummaryItem = {
  key: string;
  total: number;
};

type GroupByMode = "category" | "date";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByMode>("category");
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [spentAt, setSpentAt] = useState("");

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // editing
  const [editingId, setEditingId] = useState<number | null>(null);

  async function loadExpenses() {
    try {
      const res = await fetch(`${API_BASE}/expenses`);
      if (!res.ok) throw new Error("Failed to load expenses");
      const data = await res.json();
      const normalized: Expense[] = data.map((e: any) => ({
        ...e,
        amount: Number(e.amount),
        amount_base: Number(e.amount_base),
      }));
      setExpenses(normalized);
    } catch (err) {
      console.error(err);
      setError("Could not fetch expenses from the server.");
    }
  }

  async function loadSummary(mode: GroupByMode = groupBy) {
    setLoadingSummary(true);
    try {
      const res = await fetch(
        `${API_BASE}/expenses/summary?group_by=${mode}`
      );
      if (!res.ok) throw new Error("Failed to load summary");
      const data = await res.json();
      const normalized: SummaryItem[] = data.map((s: any) => ({
        ...s,
        total: Number(s.total),
      }));
      setSummary(normalized);
    } catch (err) {
      console.error(err);
      setError("Could not fetch summary from the server.");
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadExpenses();
    loadSummary("category");
  }, []);

  async function handleCreateOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amount || !spentAt) {
      setError("Please provide an amount and date.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: Number(amount),
        currency,
        category,
        description: description || null,
        spent_at: spentAt,
      };

      const isEditing = editingId !== null;
      const url = isEditing
        ? `${API_BASE}/expenses/${editingId}?convert_to_base=true`
        : `${API_BASE}/expenses?convert_to_base=true`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("Save failed:", body ?? res.statusText);
        throw new Error("Failed to save expense");
      }

      await loadExpenses();
      await loadSummary(groupBy);

      // reset form
      setAmount("");
      setDescription("");
      setSpentAt("");
      setCategory("Food");
      setCurrency("CAD");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("Could not save expense. Check backend/API.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = window.confirm("Delete this expense?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Delete failed:", res.statusText);
        throw new Error("Failed to delete expense");
      }
      // If we were editing this one, cancel edit mode
      if (editingId === id) {
        setEditingId(null);
        setAmount("");
        setDescription("");
        setSpentAt("");
        setCategory("Food");
        setCurrency("CAD");
      }
      await loadExpenses();
      await loadSummary(groupBy);
    } catch (err) {
      console.error(err);
      setError("Could not delete expense.");
    }
  }

  function handleStartEdit(exp: Expense) {
    setEditingId(exp.id);
    setAmount(exp.amount.toString());
    setCurrency(exp.currency);
    setCategory(exp.category);
    setDescription(exp.description ?? "");
    setSpentAt(exp.spent_at); // already yyyy-mm-dd from backend
  }

  function handleCancelEdit() {
    setEditingId(null);
    setAmount("");
    setCurrency("CAD");
    setCategory("Food");
    setDescription("");
    setSpentAt("");
  }

  // Unique categories for filter dropdown
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  // Stats for dashboard cards
  const baseCurrency = expenses[0]?.base_currency ?? "CAD";

  const totalBase = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, e) => sum + Number(e.amount_base),
        0
      ),
    [filteredExpenses]
  );

  const totalCount = filteredExpenses.length;

  const latestDate = useMemo(() => {
    if (!expenses.length) return null;
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime()
    );
    return sorted[0].spent_at;
  }, [expenses]);

  // Chart: get max total for scaling bar heights
  const maxTotal = useMemo(
    () => (summary.length ? Math.max(...summary.map((s) => s.total)) : 0),
    [summary]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "2rem 1rem",
        background:
          "radial-gradient(circle at top left, #1d4ed8 0, #020617 45%, #020617 100%)",
        color: "white",
        fontFamily:
          "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>ExpenseTracker Lite</h1>
            <p
              style={{
                marginTop: "0.25rem",
                opacity: 0.8,
                fontSize: "0.95rem",
              }}
            >
              Track spending across currencies with live FX normalization into{" "}
              <strong>{baseCurrency}</strong>.
            </p>
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              opacity: 0.75,
              textAlign: "right",
            }}
          >
            <div>Backend: FastAPI + PostgreSQL</div>
            <div>FX: exchangerate.host (Adapter)</div>
            <div>Reports: Strategy pattern</div>
          </div>
        </header>

        {/* Top stats */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <StatCard
            label={`Total (${baseCurrency})`}
            value={
              totalBase
                ? `${totalBase.toFixed(2)} ${baseCurrency}`
                : `0.00 ${baseCurrency}`
            }
            hint="Sum of all expenses converted to base currency."
          />
          <StatCard
            label="Number of Expenses"
            value={String(totalCount)}
            hint="Count after applying the category filter below."
          />
          <StatCard
            label="Latest Expense Date"
            value={latestDate ?? "—"}
            hint="Most recent spending date recorded."
          />
        </section>

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(248, 113, 113, 0.7)",
              color: "#fee2e2",
              padding: "0.75rem 1rem",
              borderRadius: 8,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Layout: left = form, right = summary + chart */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Add / Edit Expense Form */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              borderRadius: 16,
              padding: "1rem 1.2rem",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>
                {editingId ? `Edit Expense #${editingId}` : "Add Expense"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.3rem 0.75rem",
                    borderRadius: 999,
                    border: "1px solid rgba(248, 250, 252, 0.5)",
                    background: "transparent",
                    color: "#e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <form
              onSubmit={handleCreateOrUpdate}
              style={{ display: "grid", gap: "0.6rem", fontSize: "0.9rem" }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  type="text"
                  placeholder="Category (e.g. Food)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={spentAt}
                  onChange={(e) => setSpentAt(e.target.value)}
                  required
                />
              </div>

              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  resize: "vertical",
                  padding: "0.5rem 0.6rem",
                  borderRadius: 8,
                  border: "1px solid rgba(148, 163, 184, 0.6)",
                  background: "rgba(15,23,42,0.9)",
                  color: "white",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "0.25rem",
                  padding: "0.55rem 0.9rem",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #2563eb, #0ea5e9, #22c55e)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  boxShadow: loading
                    ? "none"
                    : "0 10px 25px rgba(37,99,235,0.45)",
                }}
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Expense"
                  : "Save Expense"}
              </button>
            </form>
          </div>

          {/* Summary + simple bar chart */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              borderRadius: 16,
              padding: "1rem 1.2rem",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.1rem",
                    margin: 0,
                    marginBottom: "0.15rem",
                  }}
                >
                  Summary
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    opacity: 0.75,
                  }}
                >
                  Backed by the Strategy pattern on the backend.
                </p>
              </div>
              <Select
                value={groupBy}
                onChange={async (e) => {
                  const mode = e.target.value as GroupByMode;
                  setGroupBy(mode);
                  await loadSummary(mode);
                }}
              >
                <option value="category">By category</option>
                <option value="date">By date</option>
              </Select>
            </div>

            {loadingSummary ? (
              <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>Loading…</p>
            ) : summary.length === 0 ? (
              <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                No summary data yet. Add an expense to see it here.
              </p>
            ) : (
              <>
                {/* Text summary list */}
                <ul
                  style={{
                    listStyle: "none",
                    paddingLeft: 0,
                    margin: 0,
                    display: "grid",
                    gap: "0.4rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  {summary.map((s) => (
                    <li
                      key={s.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        padding: "0.35rem 0.6rem",
                        borderRadius: 999,
                        background: "rgba(15,23,42,0.8)",
                        border: "1px solid rgba(148, 163, 184, 0.5)",
                      }}
                    >
                      <span>{s.key}</span>
                      <span>
                        {s.total.toFixed(2)} {baseCurrency}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Simple bar chart */}
                <div
                  style={{
                    marginTop: "0.5rem",
                    borderTop: "1px solid rgba(51,65,85,0.9)",
                    paddingTop: "0.6rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      marginBottom: "0.35rem",
                      fontSize: "0.78rem",
                      opacity: 0.75,
                    }}
                  >
                    Visual breakdown ({groupBy}) – simple bar chart.
                  </p>
                  <div
                    style={{
                      height: 140,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    {summary.map((s) => {
                      const pct =
                        maxTotal > 0 ? (s.total / maxTotal) * 100 : 0;
                      return (
                        <div
                          key={s.key}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              display: "flex",
                              alignItems: "flex-end",
                              width: "100%",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "70%",
                                height: `${pct || 5}%`,
                                borderRadius: 8,
                                background:
                                  "linear-gradient(180deg, #22c55e, #0ea5e9, #2563eb)",
                                boxShadow:
                                  "0 10px 20px rgba(37,99,235,0.45)",
                                transition: "height 0.2s ease",
                              }}
                              title={`${s.key}: ${s.total.toFixed(
                                2
                              )} ${baseCurrency}`}
                            />
                          </div>
                          <div
                            style={{
                              marginTop: "0.25rem",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              maxWidth: "100%",
                            }}
                          >
                            {s.key}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Expenses list */}
        <section
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            borderRadius: 16,
            padding: "1rem 1.2rem 1.2rem",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  margin: 0,
                  marginBottom: "0.2rem",
                }}
              >
                Recent Expenses
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  opacity: 0.75,
                }}
              >
                Filter by category, edit inline, or delete entries.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.8rem" }}>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              No expenses match this filter.
            </p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.82rem",
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Amount</Th>
                    <Th>Base Amount</Th>
                    <Th>Description</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id}>
                      <Td>{e.spent_at}</Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.15rem 0.6rem",
                            borderRadius: 999,
                            background: "rgba(59,130,246,0.15)",
                            border:
                              "1px solid rgba(96,165,250, 0.7)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {e.category}
                        </span>
                      </Td>
                      <Td>
                        {e.amount.toFixed(2)} {e.currency}
                      </Td>
                      <Td>
                        {e.amount_base.toFixed(2)} {e.base_currency}
                      </Td>
                      <Td style={{ maxWidth: 260 }}>
                        <span style={{ opacity: 0.9 }}>
                          {e.description ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.4rem",
                            flexWrap: "nowrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleStartEdit(e)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.6rem",
                              borderRadius: 999,
                              border: "1px solid rgba(59, 130, 246, 0.9)",
                              background: "rgba(59,130,246,0.15)",
                              color: "#bfdbfe",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.6rem",
                              borderRadius: 999,
                              border: "1px solid rgba(248, 113, 113, 0.9)",
                              background: "rgba(248,113,113,0.13)",
                              color: "#fecaca",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        
      </div>
    </main>
  );
}

/* Small presentational helpers */

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.9)",
        borderRadius: 16,
        padding: "0.9rem 1rem",
        border: "1px solid rgba(148, 163, 184, 0.3)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          opacity: 0.7,
          marginBottom: "0.35rem",
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: props.hint ? "0.25rem" : 0,
        }}
      >
        {props.value}
      </div>
      {props.hint && (
        <div
          style={{
            fontSize: "0.75rem",
            opacity: 0.65,
          }}
        >
          {props.hint}
        </div>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
function Input(props: InputProps) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        flex: 1,
        padding: "0.45rem 0.6rem",
        borderRadius: 8,
        border: "1px solid rgba(148, 163, 184, 0.6)",
        background: "rgba(15,23,42,0.9)",
        color: "white",
        fontSize: "0.9rem",
        outline: "none",
        ...style,
      }}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
function Select(props: SelectProps) {
  const { style, children, ...rest } = props;
  return (
    <select
      {...rest}
      style={{
        padding: "0.4rem 0.6rem",
        borderRadius: 999,
        border: "1px solid rgba(148, 163, 184, 0.6)",
        background: "rgba(15,23,42,0.95)",
        color: "white",
        fontSize: "0.85rem",
        outline: "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function Th(props: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "0.35rem 0.4rem",
        borderBottom: "1px solid rgba(148, 163, 184, 0.5)",
        fontWeight: 500,
      }}
    >
      {props.children}
    </th>
  );
}

function Td(props: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "0.4rem 0.4rem",
        borderBottom: "1px solid rgba(30, 41, 59, 0.9)",
        verticalAlign: "top",
      }}
    >
      {props.children}
    </td>
  );
}
