import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import toast from "react-hot-toast";
import StatsCard from "../../components/StatsCard";

export default function ComponentDashboard() {
  // ===== Components state =====
  const [components, setComponents] = useState([]);
  const [componentSearch, setComponentSearch] = useState("");
  const [componentFormOpen, setComponentFormOpen] = useState(false);
  const [componentEditId, setComponentEditId] = useState(null);
  const [compName, setCompName] = useState("");
  const [compTotal, setCompTotal] = useState(0);
  const [compThreshold, setCompThreshold] = useState(5);

  // ===== Trainers for dropdowns =====
  const [trainers, setTrainers] = useState([]);

  // ===== Movements state =====
  const [movements, setMovements] = useState([]);
  const [movementFilterCompId, setMovementFilterCompId] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ===== Manual Reduction state =====
  const [reduceEmployeeName, setReduceEmployeeName] = useState("");
  const [reduceReason, setReduceReason] = useState("");
  const [reduceCustomReason, setReduceCustomReason] = useState("");
  const [reduceSubmitting, setReduceSubmitting] = useState(false);
  const [reduceItems, setReduceItems] = useState([]);
  const [reduceCompIdToAdd, setReduceCompIdToAdd] = useState("");
  const [reduceQtyToAdd, setReduceQtyToAdd] = useState(1);

  // ===== Manual Return state =====
  const [returnEmployeeName, setReturnEmployeeName] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnCustomReason, setReturnCustomReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnCompIdToAdd, setReturnCompIdToAdd] = useState("");
  const [returnQtyToAdd, setReturnQtyToAdd] = useState(1);

  // ===== Load data =====
  const loadComponents = () => {
    apiFetch("/api/components")
      .then((res) => res.json())
      .then((data) => setComponents(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading components", err));
  };

  const loadTrainers = () => {
    apiFetch("/api/users/trainers")
      .then((res) => res.json())
      .then((data) => setTrainers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading trainers", err));
  };

  const loadMovements = () => {
    const url = movementFilterCompId
      ? `/api/components/movements?componentId=${movementFilterCompId}`
      : "/api/components/movements";
    apiFetch(url)
      .then((res) => res.json())
      .then((data) => setMovements(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading movements", err));
  };

  useEffect(() => {
    loadComponents();
    loadTrainers();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [movementFilterCompId]);

  // ===== Component CRUD =====
  const openCreateComponent = () => {
    setComponentEditId(null);
    setCompName("");
    setCompTotal(0);
    setCompThreshold(5);
    setComponentFormOpen(true);
  };

  const openEditComponent = (comp) => {
    setComponentEditId(comp.id);
    setCompName(comp.name || comp.componentName || "");
    setCompTotal(comp.totalStock ?? 0);
    setCompThreshold(comp.lowStockThreshold ?? 5);
    setComponentFormOpen(true);
  };

  const saveComponent = async () => {
    if (!compName.trim()) return;

    try {
      let res;
      if (componentEditId) {
        res = await apiFetch(`/api/components/${componentEditId}`, {
          method: "PUT",
          body: JSON.stringify({
            id: componentEditId,
            name: compName.trim(),
            totalStock: Number(compTotal),
            lowStockThreshold: Number(compThreshold),
          }),
        });
      } else {
        res = await apiFetch("/api/components", {
          method: "POST",
          body: JSON.stringify({
            name: compName.trim(),
            totalStock: Number(compTotal),
            lowStockThreshold: Number(compThreshold),
          }),
        });
      }

      if (res.ok) {
        setComponentFormOpen(false);
        loadComponents();
        toast.success("Component saved successfully!");
      } else {
        const text = await res.text();
        toast.error(text || "Failed to save component.");
      }
    } catch {
      toast.error("Failed to save component.");
    }
  };

  const deleteComponent = async (compId) => {
    if (!window.confirm("Are you sure you want to delete this component?")) return;
    try {
      const res = await apiFetch(`/api/components/${compId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Component deleted successfully!");
        loadComponents();
      } else {
        const text = await res.text();
        toast.error(text || "Failed to delete component.");
      }
    } catch {
      toast.error("Failed to delete component.");
    }
  };

  const filteredComponents = useMemo(() => {
    return components.filter((c) =>
      (c?.name || c?.componentName || "").toLowerCase().includes(componentSearch.toLowerCase())
    );
  }, [components, componentSearch]);

  // ===== Summary stats =====
  const totalStock = components.reduce((sum, c) => sum + (c.totalStock ?? 0), 0);
  const issuedStock = components.reduce((sum, c) => sum + (c.issuedStock ?? 0), 0);
  const availableStock = totalStock - issuedStock;
  const lowStockCount = components.filter((c) => {
    const avail = (c.totalStock ?? 0) - (c.issuedStock ?? 0);
    return avail <= (c.lowStockThreshold ?? 5);
  }).length;

  const componentUsageStats = useMemo(() => {
    const countsMap = {};
    movements.forEach((m) => {
      if (m.movementType === "ISSUE" && m.component) {
        const name = m.component.name || m.component.componentName || "Unknown";
        countsMap[name] = (countsMap[name] || 0) + (m.quantityChanged || 0);
      }
    });

    return Object.entries(countsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // 1. Search by Employee
      if (searchEmployee.trim()) {
        const emp = (m.employeeName || "").toLowerCase();
        if (!emp.includes(searchEmployee.trim().toLowerCase())) {
          return false;
        }
      }

      // 2. Filter by type (Reduction vs Return)
      if (filterType === "REDUCTION") {
        if (m.movementType !== "ISSUE" && m.movementType !== "MANUAL_REDUCTION") {
          return false;
        }
      } else if (filterType === "RETURN") {
        if (m.movementType !== "RETURN" && m.movementType !== "MANUAL_RETURN") {
          return false;
        }
      }

      // 3. Date Range Filter
      if (m.timestamp) {
        const mDate = new Date(m.timestamp);
        if (dateFrom) {
          const fromLimit = new Date(dateFrom);
          fromLimit.setHours(0, 0, 0, 0);
          if (mDate < fromLimit) return false;
        }
        if (dateTo) {
          const toLimit = new Date(dateTo);
          toLimit.setHours(23, 59, 59, 999);
          if (mDate > toLimit) return false;
        }
      } else if (dateFrom || dateTo) {
        return false;
      }

      return true;
    });
  }, [movements, searchEmployee, filterType, dateFrom, dateTo]);

  const groupedMovements = useMemo(() => {
    const groups = [];
    
    const sorted = [...filteredMovements].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    sorted.forEach((m) => {
      const mTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      
      const matchedGroup = groups.find((g) => {
        if (g.employeeName !== m.employeeName) return false;
        if (g.performedBy !== m.performedBy) return false;
        if (g.movementType !== m.movementType) return false;
        if (g.notes !== m.notes) return false;
        if (g.activityName !== m.activityName) return false;
        
        const gTime = g.timestamp ? new Date(g.timestamp).getTime() : 0;
        return Math.abs(gTime - mTime) <= 5000;
      });

      if (matchedGroup) {
        matchedGroup.items.push(m);
      } else {
        groups.push({
          id: m.id,
          employeeName: m.employeeName,
          performedBy: m.performedBy,
          movementType: m.movementType,
          notes: m.notes,
          activityName: m.activityName,
          timestamp: m.timestamp,
          items: [m],
        });
      }
    });

    return groups;
  }, [filteredMovements]);

  const getCleanReason = (notes, activityName) => {
    if (!notes) return activityName || "-";
    if (notes.startsWith("Manual stock reduction. Reason: ")) {
      return notes.replace("Manual stock reduction. Reason: ", "");
    }
    if (notes.startsWith("Manual stock return. Reason: ")) {
      return notes.replace("Manual stock return. Reason: ", "");
    }
    return notes;
  };

  // ===== Manual Reduction helper handlers =====
  const handleAddReduceItem = () => {
    if (!reduceCompIdToAdd) {
      toast.error("Please select a component to add.");
      return;
    }
    const qty = parseInt(reduceQtyToAdd, 10);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    const compId = Number(reduceCompIdToAdd);

    if (reduceItems.some((item) => item.componentId === compId)) {
      setReduceItems(
        reduceItems.map((item) =>
          item.componentId === compId
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      );
      toast.success("Updated quantity for component.");
    } else {
      setReduceItems([...reduceItems, { componentId: compId, quantity: qty }]);
      toast.success("Component added to reduction list.");
    }
    setReduceCompIdToAdd("");
    setReduceQtyToAdd(1);
  };

  const handleRemoveReduceItem = (compId) => {
    setReduceItems(reduceItems.filter((item) => item.componentId !== compId));
  };

  // ===== Manual Reduction handler =====
  const handleManualReduce = async (e) => {
    e.preventDefault();
    if (!reduceEmployeeName) { toast.error("Please select an Employee / Trainer Name."); return; }
    if (reduceItems.length === 0) { toast.error("Please add at least one component to the list."); return; }
    if (!reduceReason) { toast.error("Reason is required."); return; }

    const finalReason = reduceReason === "Other" ? reduceCustomReason.trim() : reduceReason;
    if (!finalReason) { toast.error("Please enter a custom reason."); return; }

    // Client-side validation: Check that all components have sufficient stock first
    for (const item of reduceItems) {
      const comp = components.find((c) => c.id === item.componentId);
      const available = comp ? (comp.totalStock - comp.issuedStock) : 0;
      if (item.quantity > available) {
        toast.error(`Insufficient stock for ${comp?.name || comp?.componentName || "component"}. Required: ${item.quantity}, Available: ${available}`);
        return;
      }
    }

    setReduceSubmitting(true);
    try {
      // Loop sequentially to avoid database deadlock and log audit rows cleanly
      for (const item of reduceItems) {
        const res = await apiFetch("/api/components/manual-reduce", {
          method: "POST",
          body: JSON.stringify({
            employeeName: reduceEmployeeName,
            componentId: item.componentId,
            quantity: item.quantity,
            reason: finalReason,
          }),
        });

        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Failed to reduce component stock.`);
        }
      }

      toast.success("Stock reduced successfully!");
      setReduceEmployeeName("");
      setReduceReason("");
      setReduceCustomReason("");
      setReduceItems([]);
      loadComponents();
      loadMovements();
    } catch (err) {
      toast.error(err.message || "Failed to reduce stock.");
    } finally {
      setReduceSubmitting(false);
    }
  };

  // ===== Manual Return helper handlers =====
  const handleAddReturnItem = () => {
    if (!returnCompIdToAdd) {
      toast.error("Please select a component to add.");
      return;
    }
    const qty = parseInt(returnQtyToAdd, 10);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    const compId = Number(returnCompIdToAdd);

    if (returnItems.some((item) => item.componentId === compId)) {
      setReturnItems(
        returnItems.map((item) =>
          item.componentId === compId
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      );
      toast.success("Updated quantity for component.");
    } else {
      setReturnItems([...returnItems, { componentId: compId, quantity: qty }]);
      toast.success("Component added to return list.");
    }
    setReturnCompIdToAdd("");
    setReturnQtyToAdd(1);
  };

  const handleRemoveReturnItem = (compId) => {
    setReturnItems(returnItems.filter((item) => item.componentId !== compId));
  };

  // ===== Manual Return handler =====
  const handleManualReturn = async (e) => {
    e.preventDefault();
    if (!returnEmployeeName) { toast.error("Please select an Employee / Trainer Name."); return; }
    if (returnItems.length === 0) { toast.error("Please add at least one component to the list."); return; }
    if (!returnReason) { toast.error("Reason is required."); return; }

    const finalReason = returnReason === "Other" ? returnCustomReason.trim() : returnReason;
    if (!finalReason) { toast.error("Please enter a custom reason."); return; }

    setReturnSubmitting(true);
    try {
      // Loop sequentially to avoid deadlocks and maintain clean history logs
      for (const item of returnItems) {
        const res = await apiFetch("/api/components/manual-return", {
          method: "POST",
          body: JSON.stringify({
            employeeName: returnEmployeeName,
            componentId: item.componentId,
            quantity: item.quantity,
            reason: finalReason,
          }),
        });

        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Failed to return component stock.`);
        }
      }

      toast.success("Stock returned successfully!");
      setReturnEmployeeName("");
      setReturnReason("");
      setReturnCustomReason("");
      setReturnItems([]);
      loadComponents();
      loadMovements();
    } catch (err) {
      toast.error(err.message || "Failed to return stock.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  // ===== Movement type display helpers =====
  const getMovementBadge = (type) => {
    switch (type) {
      case "ISSUE":
        return <span className="text-orange-600 font-semibold">ISSUE</span>;
      case "RETURN":
        return <span className="text-green-600 font-semibold">RETURN</span>;
      case "MANUAL_REDUCTION":
        return <span className="text-red-600 font-semibold">MANUAL REDUCTION</span>;
      case "MANUAL_RETURN":
        return <span className="text-teal-600 font-semibold">MANUAL RETURN</span>;
      default:
        return <span className="text-gray-500 font-semibold">{type}</span>;
    }
  };

  const getMovementQty = (m) => {
    const isDeduction = m.movementType === "ISSUE" || m.movementType === "MANUAL_REDUCTION";
    return (
      <span className={isDeduction ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
        {isDeduction ? "-" : "+"}{m.quantityChanged}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Component / Stock Dashboard</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search component..."
            className="border p-2 rounded w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={componentSearch}
            onChange={(e) => setComponentSearch(e.target.value)}
          />
          <button
            onClick={openCreateComponent}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            Add Stock
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Stock" value={totalStock} sub="All components" icon="📦" />
        <StatsCard title="Issued Stock" value={issuedStock} sub="Currently issued" icon="📤" />
        <StatsCard title="Available Stock" value={availableStock} sub="Ready for use" icon="✅" />
        <StatsCard title="Low Stock Alerts" value={lowStockCount} sub="Below threshold" icon="⚠️" />
      </div>

      {/* COMPONENTS & ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COMPONENTS TABLE */}
        <div className="bg-white p-6 rounded-xl shadow overflow-x-auto lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Components Stock</h3>
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Component Name</th>
                <th className="p-3 border text-left">Total Stock</th>
                <th className="p-3 border text-left">Issued Stock</th>
                <th className="p-3 border text-left">Available Stock</th>
                <th className="p-3 border text-left">Low Threshold</th>
                <th className="p-3 border text-left">Status</th>
                <th className="p-3 border text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComponents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-gray-500">
                    No components found
                  </td>
                </tr>
              ) : (
                filteredComponents.map((c) => {
                  const total = c?.totalStock ?? 0;
                  const issued = c?.issuedStock ?? 0;
                  const threshold = c?.lowStockThreshold ?? 5;
                  const available = total - issued;
                  const isLow = available <= threshold;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3 border font-semibold">{c.name || c.componentName || "Unnamed"}</td>
                      <td className="p-3 border">{total}</td>
                      <td className="p-3 border">{issued}</td>
                      <td className="p-3 border">{available}</td>
                      <td className="p-3 border text-gray-500">{threshold}</td>
                      <td className="p-3 border">
                        {isLow ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            ⚠️ Low Stock Warning
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            ✓ In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 border">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditComponent(c)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteComponent(c.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOST USED COMPONENTS ANALYTICS */}
        <div className="bg-white p-6 rounded-xl shadow flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Most Used Components</h3>
            <p className="text-xs text-gray-400">Total units consumed across all learning activities</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {componentUsageStats.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-sm italic">
                No usage recorded yet
              </div>
            ) : (
              componentUsageStats.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold rounded-full w-6 h-6 text-xs border border-indigo-100">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                  </div>
                  <div className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {item.count} units
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== MANUAL ADJUSTMENTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* MANUAL REDUCTION */}
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Manual Reduction</h3>
              <p className="text-xs text-gray-400">Deduct stock for damaged, lost, demo session, testing, or other purposes.</p>
            </div>
            <form onSubmit={handleManualReduce} className="space-y-4">
              {/* Employee / Trainer Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Employee / Trainer Name *
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white font-medium"
                  value={reduceEmployeeName}
                  onChange={(e) => setReduceEmployeeName(e.target.value)}
                  disabled={reduceSubmitting}
                >
                  <option value="">-- Select Trainer --</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.username}>
                      {t.fullName ? `${t.fullName} (${t.username})` : t.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Component Area */}
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                <label className="block text-xs font-semibold text-gray-600">
                  Add Components to Reduce
                </label>
                <div className="flex gap-2">
                  <select
                    className="border border-gray-300 p-2 rounded text-xs flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
                    value={reduceCompIdToAdd}
                    onChange={(e) => setReduceCompIdToAdd(e.target.value)}
                    disabled={reduceSubmitting}
                  >
                    <option value="">Select Component...</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.componentName} (Avail: {c.totalStock - c.issuedStock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="border border-gray-300 p-2 rounded text-xs w-20 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
                    placeholder="Qty"
                    value={reduceQtyToAdd}
                    onChange={(e) => setReduceQtyToAdd(Math.max(1, Number(e.target.value)))}
                    disabled={reduceSubmitting}
                  />
                  <button
                    type="button"
                    onClick={handleAddReduceItem}
                    disabled={reduceSubmitting}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded text-xs font-bold transition"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Added Components List */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Selected Components
                </label>
                {reduceItems.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-4 border border-dashed rounded-lg bg-gray-50/50 italic">
                    No components added yet. Add components above.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border rounded-lg max-h-32 overflow-y-auto">
                    {reduceItems.map((item) => {
                      const comp = components.find(c => c.id === item.componentId);
                      return (
                        <span key={item.componentId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                          <span>{comp?.name || comp?.componentName} (Qty: {item.quantity})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReduceItem(item.componentId)}
                            className="hover:bg-red-200 text-red-600 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Reason *
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white font-medium"
                  value={reduceReason}
                  onChange={(e) => setReduceReason(e.target.value)}
                  disabled={reduceSubmitting}
                >
                  <option value="">-- Select Reason --</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                  <option value="Demo Session">Demo Session</option>
                  <option value="Testing">Testing</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Recovered">Recovered</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {reduceReason === "Other" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Custom Reason *
                  </label>
                  <textarea
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="e.g. Used during science exhibition"
                    rows={2}
                    value={reduceCustomReason}
                    onChange={(e) => setReduceCustomReason(e.target.value)}
                    disabled={reduceSubmitting}
                    required
                  />
                </div>
              )}

              {/* Summary Block */}
              {reduceItems.length > 0 && reduceEmployeeName && reduceReason && (
                <div className="p-3 bg-red-50/50 border border-red-150 rounded-lg text-xs space-y-1">
                  <h4 className="font-bold text-red-800">Reduction Summary</h4>
                  <div className="text-gray-600">Trainer: <span className="font-semibold text-gray-800">{reduceEmployeeName}</span></div>
                  <div className="text-gray-600">Components: <span className="font-semibold text-gray-800">{reduceItems.map(item => {
                    const comp = components.find(c => c.id === item.componentId);
                    return `${comp?.name || comp?.componentName} (x${item.quantity})`;
                  }).join(", ")}</span></div>
                  <div className="text-gray-600">Reason: <span className="font-semibold text-gray-800">{reduceReason === "Other" ? reduceCustomReason : reduceReason}</span></div>
                </div>
              )}

              <button
                type="submit"
                disabled={reduceSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 mt-2"
              >
                {reduceSubmitting ? "Reducing..." : "Reduce Stock"}
              </button>
            </form>
          </div>
        </div>

        {/* MANUAL RETURN */}
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-teal-500 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Manual Return</h3>
              <p className="text-xs text-gray-400">Return stock for recovered, restored, or excess items.</p>
            </div>
            <form onSubmit={handleManualReturn} className="space-y-4">
              {/* Employee / Trainer Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Employee / Trainer Name *
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white font-medium"
                  value={returnEmployeeName}
                  onChange={(e) => setReturnEmployeeName(e.target.value)}
                  disabled={returnSubmitting}
                >
                  <option value="">-- Select Trainer --</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.username}>
                      {t.fullName ? `${t.fullName} (${t.username})` : t.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Component Area */}
              <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                <label className="block text-xs font-semibold text-gray-600">
                  Add Components to Return
                </label>
                <div className="flex gap-2">
                  <select
                    className="border border-gray-300 p-2 rounded text-xs flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                    value={returnCompIdToAdd}
                    onChange={(e) => setReturnCompIdToAdd(e.target.value)}
                    disabled={returnSubmitting}
                  >
                    <option value="">Select Component...</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.componentName} (Avail: {c.totalStock - c.issuedStock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="border border-gray-300 p-2 rounded text-xs w-20 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 font-medium"
                    placeholder="Qty"
                    value={returnQtyToAdd}
                    onChange={(e) => setReturnQtyToAdd(Math.max(1, Number(e.target.value)))}
                    disabled={returnSubmitting}
                  />
                  <button
                    type="button"
                    onClick={handleAddReturnItem}
                    disabled={returnSubmitting}
                    className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 px-3 py-2 rounded text-xs font-bold transition"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Added Components List */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Selected Components
                </label>
                {returnItems.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-4 border border-dashed rounded-lg bg-gray-50/50 italic">
                    No components added yet. Add components above.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border rounded-lg max-h-32 overflow-y-auto">
                    {returnItems.map((item) => {
                      const comp = components.find(c => c.id === item.componentId);
                      return (
                        <span key={item.componentId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
                          <span>{comp?.name || comp?.componentName} (Qty: {item.quantity})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReturnItem(item.componentId)}
                            className="hover:bg-teal-200 text-teal-600 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold hover:text-teal-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Reason *
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white font-medium"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  disabled={returnSubmitting}
                >
                  <option value="">-- Select Reason --</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                  <option value="Demo Session">Demo Session</option>
                  <option value="Testing">Testing</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Recovered">Recovered</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {returnReason === "Other" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Custom Reason *
                  </label>
                  <textarea
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="e.g. Returned from science exhibition"
                    rows={2}
                    value={returnCustomReason}
                    onChange={(e) => setReturnCustomReason(e.target.value)}
                    disabled={returnSubmitting}
                    required
                  />
                </div>
              )}

              {/* Summary Block */}
              {returnItems.length > 0 && returnEmployeeName && returnReason && (
                <div className="p-3 bg-teal-50/50 border border-teal-150 rounded-lg text-xs space-y-1">
                  <h4 className="font-bold text-teal-800">Return Summary</h4>
                  <div className="text-gray-600">Trainer: <span className="font-semibold text-gray-800">{returnEmployeeName}</span></div>
                  <div className="text-gray-600">Components: <span className="font-semibold text-gray-800">{returnItems.map(item => {
                    const comp = components.find(c => c.id === item.componentId);
                    return `${comp?.name || comp?.componentName} (x${item.quantity})`;
                  }).join(", ")}</span></div>
                  <div className="text-gray-600">Reason: <span className="font-semibold text-gray-800">{returnReason === "Other" ? returnCustomReason : returnReason}</span></div>
                </div>
              )}

              <button
                type="submit"
                disabled={returnSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 mt-2"
              >
                {returnSubmitting ? "Returning..." : "Return Stock"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* STOCK MOVEMENTS LOG */}
      <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Stock Movements</h3>
            <p className="text-xs text-gray-500">Historical logs of all stock changes per component</p>
          </div>
          <select
            className="border p-2 rounded w-full md:w-64"
            value={movementFilterCompId}
            onChange={(e) => setMovementFilterCompId(e.target.value)}
          >
            <option value="">All Components</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.componentName}
              </option>
            ))}
          </select>
        </div>

        {/* Compact Filters Card */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4 shadow-sm">
          {/* Row 1: Search Employee & Action Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Search Employee
              </label>
              <input
                type="text"
                placeholder="Search by employee name..."
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Action Type
              </label>
              <select
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="REDUCTION">Reductions (Issue / Manual Reduction)</option>
                <option value="RETURN">Returns (Return / Manual Return)</option>
              </select>
            </div>
          </div>

          {/* Row 2: From Date & To Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearchEmployee("");
                setFilterType("");
                setDateFrom("");
                setDateTo("");
                setMovementFilterCompId("");
              }}
              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <table className="w-full border text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">Trainer</th>
              <th className="p-3 border text-left">Components</th>
              <th className="p-3 border text-left">Quantity</th>
              <th className="p-3 border text-left">Reason</th>
              <th className="p-3 border text-left">Processed By</th>
              <th className="p-3 border text-left">Date</th>
              <th className="p-3 border text-left">Time</th>
              <th className="p-3 border text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {groupedMovements.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-6 text-gray-500">
                  No stock movements logged matching the filter criteria
                </td>
              </tr>
            ) : (
              groupedMovements.map((g) => {
                const totalQty = g.items.reduce((sum, item) => sum + item.quantityChanged, 0);
                const isDeduction = g.movementType === "ISSUE" || g.movementType === "MANUAL_REDUCTION";
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    {/* Trainer */}
                    <td className="p-3 border text-gray-700 font-semibold">{g.employeeName || "-"}</td>
                    
                    {/* Components breakdown */}
                    <td className="p-3 border">
                      <div className="space-y-1">
                        {g.items.map((item, idx) => (
                          <div key={idx} className="font-semibold text-gray-800 text-xs">
                            {item.component?.name || item.component?.componentName || "Unknown"}{" "}
                            <span className={isDeduction ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                              ({isDeduction ? "-" : "+"}{item.quantityChanged})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Quantity Total */}
                    <td className="p-3 border font-bold">
                      <span className={isDeduction ? "text-red-600" : "text-green-600"}>
                        {isDeduction ? "-" : "+"}{totalQty}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="p-3 border font-medium text-gray-800">{getCleanReason(g.notes, g.activityName)}</td>

                    {/* Processed By */}
                    <td className="p-3 border text-gray-600 font-medium">{g.performedBy}</td>

                    {/* Date */}
                    <td className="p-3 border text-gray-600 font-medium">
                      {(() => {
                        if (!g.timestamp) return "-";
                        const dateObj = new Date(g.timestamp);
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = dateObj.getFullYear();
                        return `${day}-${month}-${year}`;
                      })()}
                    </td>

                    {/* Time */}
                    <td className="p-3 border text-gray-500 font-mono text-xs">
                      {(() => {
                        if (!g.timestamp) return "-";
                        const dateObj = new Date(g.timestamp);
                        const hours = String(dateObj.getHours()).padStart(2, '0');
                        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                        return `${hours}:${minutes}:${seconds}`;
                      })()}
                    </td>

                    {/* Type Badge */}
                    <td className="p-3 border">{getMovementBadge(g.movementType)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* COMPONENT FORM MODAL */}
      {componentFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow w-full max-w-lg p-5">
            <h4 className="text-lg font-semibold mb-3">
              {componentEditId ? "Edit Component details" : "Add Component"}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Component Name *</label>
                <input
                  className="border p-2 rounded w-full"
                  placeholder="e.g. Arduino Uno"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Total Stock *</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full"
                    value={compTotal}
                    onChange={(e) => setCompTotal(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Low Threshold *</label>
                  <input
                    type="number"
                    className="border p-2 rounded w-full"
                    value={compThreshold}
                    onChange={(e) => setCompThreshold(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => setComponentFormOpen(false)}
                className="border px-4 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveComponent}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
