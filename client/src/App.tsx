import { useEffect, useMemo, useState } from "react";

type Order = {
    id: number;
    itemName: string;
    itemPrice: number;
    createdAt?: string;
};

const API_BASE = "http://localhost:3000/api";

function buildQuery(params: Record<string, string | number | undefined>) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
}

export default function App() {
    // list state
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    // filters
    const [minPrice, setMinPrice] = useState<string>("");
    const [maxPrice, setMaxPrice] = useState<string>("");

    // create/update form state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState<string>("");

    // details state
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [details, setDetails] = useState<Order | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string>("");

    const isEditing = useMemo(() => editingId !== null, [editingId]);

    async function fetchOrders() {
        setLoading(true);
        setError("");

        try {
            const qs = buildQuery({
                minPrice: minPrice.trim() !== "" ? minPrice.trim() : undefined,
                maxPrice: maxPrice.trim() !== "" ? maxPrice.trim() : undefined,
            });

            console.log(qs)

            const res = await fetch(`${API_BASE}/orders${qs}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Failed to fetch orders (${res.status})`);
            }

            const data = (await res.json()) as Order[];
            setOrders(data);
        } catch (e: any) {
            setError(e?.message ?? "Unknown error");
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchOrderDetails(id: number) {
        setDetailsId(id);
        setDetails(null);
        setDetailsError("");
        setDetailsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/orders/${id}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Failed to fetch order details (${res.status})`);
            }

            const data = (await res.json()) as Order;
            setDetails(data);
        } catch (e: any) {
            setDetailsError(e?.message ?? "Unknown error");
        } finally {
            setDetailsLoading(false);
        }
    }

    function resetForm() {
        setEditingId(null);
        setName("");
        setPrice("");
    }

    async function handleCreateOrUpdate() {
        setError("");

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("name is required");
            return;
        }

        // allow 0 price, but disallow empty
        if (price.trim() === "") {
            setError("price is required");
            return;
        }
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            setError("price must be a valid non-negative number");
            return;
        }

        const payload = {
            itemName: trimmedName,
            itemPrice: numericPrice,
        };

        try {
            const url = isEditing
                ? `${API_BASE}/orders/${editingId}`
                : `${API_BASE}/orders/create`;

            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Request failed (${res.status})`);
            }

            resetForm();
            await fetchOrders();

            if (detailsId && isEditing && detailsId === editingId) {
                await fetchOrderDetails(detailsId);
            }
        } catch (e: any) {
            setError(e?.message ?? "Unknown error");
        }
    }

    function startEdit(o: Order) {
        setEditingId(o.id);
        setName(o.itemName ?? "");
        setPrice(String(o.itemPrice ?? ""));
    }

    async function handleDelete(id: number) {
        setError("");

        const ok = confirm(`Delete order #${id}?`);
        if (!ok) return;

        try {
            const res = await fetch(`${API_BASE}/orders/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Delete failed (${res.status})`);
            }

            // clear details if deleted
            if (detailsId === id) {
                setDetailsId(null);
                setDetails(null);
                setDetailsError("");
            }

            // clear form if you were editing it
            if (editingId === id) {
                resetForm();
            }

            await fetchOrders();
        } catch (e: any) {
            setError(e?.message ?? "Unknown error");
        }
    }

    useEffect(() => {
        fetchOrders();
    }, []);

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
            <h1 style={{ marginBottom: 4 }}>Orders CRUD</h1>
            <p style={{ marginTop: 0, color: "#555" }}>
                Create, list (with min/max price filters), view details, update, and delete.
            </p>

            {error ? (
                <div style={{ background: "#ffe8e8", border: "1px solid #ffb3b3", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <strong>Error:</strong> {error}
                </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
                {/* LEFT: Create/Update Form + Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                        <h2 style={{ marginTop: 0 }}>{isEditing ? `Update Order #${editingId}` : "Create Order"}</h2>

                        <label style={{ display: "block", marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Name</div>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mouse"
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                            />
                        </label>

                        <label style={{ display: "block", marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Price</div>
                            <input
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="e.g. 29.90"
                                inputMode="decimal"
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                            />
                        </label>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={handleCreateOrUpdate}
                                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#333", color: "#fff", cursor: "pointer" }}
                            >
                                {isEditing ? "Update" : "Create"}
                            </button>

                            <button
                                onClick={() => resetForm()}
                                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                        <h2 style={{ marginTop: 0 }}>Order Details</h2>

                        {!detailsId ? (
                            <div style={{ color: "#666" }}>Select “Details” from the table.</div>
                        ) : detailsLoading ? (
                            <div style={{ color: "#666" }}>Loading details…</div>
                        ) : detailsError ? (
                            <div style={{ color: "#b00020" }}>{detailsError}</div>
                        ) : details ? (
                            <div style={{ lineHeight: 1.6 }}>
                                <div><strong>ID:</strong> {details.id}</div>
                                <div><strong>Name:</strong> {details.itemName}</div>
                                <div><strong>Price:</strong> {String(details.itemPrice)}</div>
                                {details.createdAt ? <div><strong>Created:</strong> {new Date(details.createdAt).toLocaleString()}</div> : null}

                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                    <button
                                        onClick={() => startEdit(details)}
                                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => handleDelete(details.id)}
                                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #b00020", background: "#fff", color: "#b00020", cursor: "pointer" }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: "#666" }}>No data.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Filters + Table */}
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Min price</div>
                            <input
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="e.g. 10"
                                inputMode="decimal"
                                style={{ width: 140, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Max price</div>
                            <input
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="e.g. 100"
                                inputMode="decimal"
                                style={{ width: 140, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                            />
                        </div>

                        <button
                            onClick={() => fetchOrders()}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#333", color: "#fff", cursor: "pointer" }}
                        >
                            Apply
                        </button>

                        <button
                            onClick={() => {
                                setMinPrice("");
                                setMaxPrice("");
                                // after state updates, fetch all
                                setTimeout(() => fetchOrders(), 0);
                            }}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                        >
                            Reset
                        </button>

                        <div style={{ marginLeft: "auto", color: "#666" }}>
                            {loading ? "Loading…" : `${orders.length} orders`}
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                                    <th style={{ padding: "10px 8px" }}>ID</th>
                                    <th style={{ padding: "10px 8px" }}>Name</th>
                                    <th style={{ padding: "10px 8px" }}>Price</th>
                                    <th style={{ padding: "10px 8px" }}>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                                            No orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                                            <td style={{ padding: "10px 8px" }}>{o.id}</td>
                                            <td style={{ padding: "10px 8px" }}>{o.itemName}</td>
                                            <td style={{ padding: "10px 8px" }}>{String(o.itemPrice)}</td>
                                            <td style={{ padding: "10px 8px", display: "flex", gap: 8 }}>
                                                <button
                                                    onClick={() => fetchOrderDetails(o.id)}
                                                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                                >
                                                    Details
                                                </button>

                                                <button
                                                    onClick={() => startEdit(o)}
                                                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(o.id)}
                                                    style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #b00020", background: "#fff", color: "#b00020", cursor: "pointer" }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}