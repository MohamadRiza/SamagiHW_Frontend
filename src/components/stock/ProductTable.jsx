import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { FaEdit, FaPrint, FaTrash, FaEye } from "react-icons/fa";
import BarcodeGenerator from "./BarcodeGenerator";

const ACTION_MENU_OPTIONS = [
  { key: 'edit',   label: 'Edit Product',   icon: FaEdit,  shortcut: 'E', color: 'text-blue-700  bg-blue-50  hover:bg-blue-100  border-blue-200'  },
  { key: 'print',  label: 'Print Barcode',  icon: FaPrint, shortcut: 'P', color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { key: 'delete', label: 'Delete Product', icon: FaTrash, shortcut: 'D', color: 'text-red-700    bg-red-50   hover:bg-red-100   border-red-200'   },
];

const ProductTable = ({ products, onEdit, onDelete, onPrintBarcode, loading }) => {
  const [searchTerm, setSearchTerm]         = useState("");
  const [filterCredit, setFilterCredit]     = useState(false);
  const [selectedIndex, setSelectedIndex]   = useState(-1);
  const [actionProduct, setActionProduct]   = useState(null);
  const [actionMenuIdx, setActionMenuIdx]   = useState(0);
  const [previewProduct, setPreviewProduct] = useState(null);

  const searchRef     = useRef(null);
  const tableRef      = useRef(null);
  const actionMenuRef = useRef(null);

  // ── Smart Search ─────────────────────────────────────────────────────────
  // Rules:
  //   • If query starts with '#' → match only by primary key (exact, user must type '#')
  //   • Otherwise → match item_name, barcode, or any sub_brand (case-insensitive)
  //     Also handles combined "BRAND ITEM" or "ITEM BRAND" patterns
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Credit filter
      const matchesCredit = !filterCredit || p.is_credit_item;
      if (!matchesCredit) return false;

      if (!searchTerm) return true;

      const raw = searchTerm.trim();

      // ── Primary key search: must start with '#' ──
      if (raw.startsWith('#')) {
        const idStr = raw.slice(1).trim();
        if (idStr === '') return false; // '#' alone → no match
        return String(p.id) === idStr;
      }

      // ── Normal search ──
      const q = raw.toLowerCase();

      // Match item_name
      if (p.item_name?.toLowerCase().includes(q)) return true;

      // Match barcode
      if (p.barcode?.toLowerCase().includes(q)) return true;

      // Match any of the sub_brands
      if (p.sub_brands) {
        const brands = p.sub_brands.split(',').map((b) => b.trim().toLowerCase());
        // Direct brand match
        if (brands.some((b) => b.includes(q))) return true;

        // Combined search: "DELL KEYBOARD" or "KEYBOARD DELL"
        // Split query into words and check if item_name matches one word and brand matches another
        const words = q.split(/\s+/);
        if (words.length >= 2) {
          const nameMatches = (word) => p.item_name?.toLowerCase().includes(word);
          const brandMatches = (word) => brands.some((b) => b.includes(word));
          // At least one word matches name AND at least one word matches a brand
          if (words.some(nameMatches) && words.some(brandMatches)) return true;
        }
      }

      return false;
    });
  }, [products, searchTerm, filterCredit]);

  // Reset selection when list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, filteredProducts.length - 1));
  }, [filteredProducts.length]);

  // Scroll selected row into view (inside the table's own scrollable container)
  useEffect(() => {
    if (selectedIndex >= 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("tbody tr[data-row]");
      rows[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Focus action menu on open
  useEffect(() => {
    if (actionProduct) {
      setActionMenuIdx(0);
      setTimeout(() => actionMenuRef.current?.focus(), 30);
    }
  }, [actionProduct]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getFinalPrice = (p) =>
    p.discount_type === "percent"
      ? p.selling_price - (p.selling_price * p.discount_value) / 100
      : p.selling_price - p.discount_value;

  const getStockStatus = (stock) => {
    if (stock <= 0)  return { label: "Out of Stock", cls: "bg-red-100   text-red-800"   };
    if (stock <= 10) return { label: "Low Stock",    cls: "bg-amber-100 text-amber-800" };
    return               { label: "In Stock",     cls: "bg-emerald-100 text-emerald-800" };
  };

  const dispatchAction = useCallback((key, product) => {
    setActionProduct(null);
    setSelectedIndex(-1);
    setTimeout(() => {
      if (key === 'edit')   onEdit(product);
      if (key === 'print')  onPrintBarcode({ ...product, final_price: getFinalPrice(product) });
      if (key === 'delete') onDelete(product.id);
    }, 0);
  }, [onEdit, onPrintBarcode, onDelete]);

  // ── Global keyboard handler ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (actionProduct) return;

      const activeEl = document.activeElement;
      const isInSearch = activeEl === searchRef.current;
      const activeTag  = activeEl?.tagName;
      const isTyping   = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      // Detect if focus is on a table row (to avoid double-triggering ArrowUp/Down
      // since tr's own onKeyDown also handles them — we let the row handler do it)
      const isInRow = activeEl?.closest('tr[data-row]') != null;

      // ── Ctrl+F / '/' → focus search ──
      if ((e.ctrlKey && e.key === 'f') || (!isTyping && e.key === '/')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // ── ArrowDown from search bar: jump to first table row ──
      if (isInSearch && e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredProducts.length > 0) {
          setSelectedIndex(0);
          // focus the first row so subsequent arrows work via row handler
          setTimeout(() => {
            tableRef.current?.querySelector('tbody tr[data-row]')?.focus();
          }, 0);
        }
        return;
      }

      // ── Skip if typing (other inputs) or already handled by row handler ──
      if (isTyping || isInRow) return;

      // ── Arrow navigation (when no row is focused) ──
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => {
          if (filteredProducts.length === 0) return -1;
          return i === -1 ? 0 : Math.min(i + 1, filteredProducts.length - 1);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => {
          if (i <= 0) return 0;
          return i - 1;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        setActionProduct(filteredProducts[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actionProduct, filteredProducts, selectedIndex]);

  // ── Action menu keyboard ──────────────────────────────────────────────────
  const handleMenuKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActionMenuIdx((i) => (i + 1) % ACTION_MENU_OPTIONS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActionMenuIdx((i) => (i - 1 + ACTION_MENU_OPTIONS.length) % ACTION_MENU_OPTIONS.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      dispatchAction(ACTION_MENU_OPTIONS[actionMenuIdx].key, actionProduct);
    } else if (e.key === 'Escape') {
      setActionProduct(null);
    } else {
      const opt = ACTION_MENU_OPTIONS.find(o => o.shortcut === e.key.toUpperCase());
      if (opt) dispatchAction(opt.key, actionProduct);
    }
  };

  // ── Search field keyboard (Escape only — ArrowDown handled in global handler) ──
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
      searchRef.current?.blur();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 relative">

      {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full flex items-center">
            <div className="absolute left-3 flex items-center justify-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, brand, barcode…  or #ID for exact ID search  (Ctrl+F or /)"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedIndex(-1); }}
              onKeyDown={handleSearchKeyDown}
              className="input-pos pl-10 pr-4 w-full h-11 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters + count */}
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={filterCredit}
                onChange={(e) => setFilterCredit(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Credit Only
            </label>
            <span className="text-sm text-gray-400 whitespace-nowrap">
              {filteredProducts.length} / {products.length}
            </span>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="mt-2 text-xs text-gray-400">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">↑↓</kbd> navigate ·{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> actions ·{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Esc</kbd> deselect ·{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">#5</kbd> search by ID
        </p>
      </div>

      {/* ── Table (vertical scroll lives here so scrollIntoView works) ── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]" ref={tableRef}>
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['ID', 'Barcode', 'Item', 'Compatible Brands', 'Prices (LKR)', 'Stock', 'Discount', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Loading products…
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  {searchTerm || filterCredit ? 'No matching products found' : 'No products added yet'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, idx) => {
                const stockStatus = getStockStatus(product.stock_quantity);
                const finalPrice  = getFinalPrice(product);
                const isSelected  = idx === selectedIndex;

                // Parse sub_brands for display
                const brandList = (product.sub_brands || '')
                  .split(',')
                  .map((b) => b.trim())
                  .filter(Boolean);

                return (
                  <tr
                    key={product.id}
                    data-row
                    tabIndex={0}
                    onClick={() => setSelectedIndex(idx)}
                    onDoubleClick={() => { setSelectedIndex(idx); setActionProduct(product); }}
                    onKeyDown={(e) => {
                      // ArrowUp/Down: handled here (row is focused) AND prevented from
                      // bubbling to the global window handler via the isInRow guard.
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = Math.min(idx + 1, filteredProducts.length - 1);
                        setSelectedIndex(next);
                        // Move DOM focus to the next row for continuous keyboard nav
                        const rows = tableRef.current?.querySelectorAll('tbody tr[data-row]');
                        rows?.[next]?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = Math.max(idx - 1, 0);
                        setSelectedIndex(prev);
                        const rows = tableRef.current?.querySelectorAll('tbody tr[data-row]');
                        rows?.[prev]?.focus();
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        setActionProduct(product);
                      } else if (e.key === 'Escape') {
                        setSelectedIndex(-1);
                        tableRef.current?.querySelector('tbody tr[data-row]')?.blur();
                      }
                    }}
                    className={`transition-colors outline-none cursor-pointer
                      ${isSelected
                        ? 'bg-primary-50 ring-1 ring-inset ring-primary-300'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="w-1.5 h-6 rounded-full bg-primary-500 inline-block shrink-0" />
                        )}
                        <span className="font-mono font-bold text-primary-700">#{product.id}</span>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {product.barcode}
                        </code>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewProduct(product); }}
                          className="text-primary-600 hover:text-primary-700 text-xs focus:outline-none p-1 hover:bg-primary-50 rounded"
                          title="View Barcode"
                          tabIndex={-1}
                        >
                          <FaEye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{product.item_name}</p>
                      {product.company && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {product.company}
                        </span>
                      )}
                    </td>

                    {/* Compatible Brands */}
                    <td className="px-4 py-3">
                      {brandList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {brandList.map((b, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Prices */}
                    <td className="px-4 py-3 text-sm">
                      <p className="text-gray-900">Sell: <strong>LKR {product.selling_price.toFixed(2)}</strong></p>
                      <p className="text-xs text-gray-500">Cost: LKR {product.buying_price.toFixed(2)}</p>
                      <p className="text-xs font-medium text-primary-700">Final: LKR {finalPrice.toFixed(2)}</p>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.cls}`}>
                        {product.stock_quantity} · {stockStatus.label}
                      </span>
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3 text-sm">
                      {product.discount_value > 0 ? (
                        <span className="text-amber-700">
                          {product.discount_value}{product.discount_type === 'percent' ? '%' : ' LKR'}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit (E)"
                          tabIndex={-1}
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPrintBarcode({ ...product, final_price: finalPrice }); }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print Barcode (P)"
                          tabIndex={-1}
                        >
                          <FaPrint className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete (D)"
                          tabIndex={-1}
                        >
                          <FaTrash className="w-3.5 h-3.5" />
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

      {/* ── Action Menu Modal ───────────────────────────────────────────── */}
      {actionProduct && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setActionProduct(null)}
        >
          <div
            ref={actionMenuRef}
            tabIndex={0}
            onKeyDown={handleMenuKeyDown}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 pb-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Action for</p>
              <p className="font-semibold text-gray-900 text-lg leading-snug">{actionProduct.item_name}</p>
              <p className="text-xs text-primary-600 font-bold">#{actionProduct.id}</p>
              <code className="text-xs text-gray-500 font-mono">{actionProduct.barcode}</code>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {ACTION_MENU_OPTIONS.map((opt, i) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => dispatchAction(opt.key, actionProduct)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                      ${actionMenuIdx === i
                        ? `${opt.color} ring-2 ring-offset-1 ring-current scale-[1.01]`
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{opt.label}</span>
                    <kbd className="text-xs px-1.5 py-0.5 bg-white/70 rounded border border-current opacity-60">
                      {opt.shortcut}
                    </kbd>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">↑↓</kbd> navigate ·{' '}
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> confirm ·{' '}
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> cancel
            </p>
          </div>
        </div>
      )}

      {/* ── Barcode Preview Modal ──────────────────────────────────────── */}
      {previewProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewProduct(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Barcode Preview</h3>
              <button
                onClick={() => setPreviewProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >✕</button>
            </div>
            {/* Pass selling_price (real price), product_id, sub_brands */}
            <BarcodeGenerator
              barcode={previewProduct.barcode}
              item_name={previewProduct.item_name}
              product_id={previewProduct.id}
              selling_price={previewProduct.selling_price}
              sub_brands={previewProduct.sub_brands}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;