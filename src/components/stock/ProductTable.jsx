import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import BarcodeGenerator from "./BarcodeGenerator";

const ACTION_MENU_OPTIONS = [
  { key: 'edit',      label: 'Edit Product',    icon: '✏️',  shortcut: 'E', color: 'text-blue-700  bg-blue-50  hover:bg-blue-100  border-blue-200'  },
  { key: 'print',     label: 'Print Barcode',   icon: '🖨️', shortcut: 'P', color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { key: 'delete',    label: 'Delete Product',  icon: '🗑️', shortcut: 'D', color: 'text-red-700    bg-red-50   hover:bg-red-100   border-red-200'   },
];

const ProductTable = ({ products, onEdit, onDelete, onPrintBarcode, loading }) => {
  const [searchTerm, setSearchTerm]       = useState("");
  const [filterCredit, setFilterCredit]   = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [actionProduct, setActionProduct] = useState(null);  // product for action menu
  const [actionMenuIdx, setActionMenuIdx] = useState(0);     // highlighted action in menu
  const [previewProduct, setPreviewProduct] = useState(null); // barcode preview

  const searchRef     = useRef(null);
  const tableRef      = useRef(null);
  const actionMenuRef = useRef(null);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        p.item_name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.short_form?.toLowerCase().includes(q);
      const matchesCredit = !filterCredit || p.is_credit_item;
      return matchesSearch && matchesCredit;
    });
  }, [products, searchTerm, filterCredit]);

  // Reset selection when list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, filteredProducts.length - 1));
  }, [filteredProducts.length]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex >= 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll("tbody tr[data-row]");
      rows[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Focus action menu on open
  useEffect(() => {
    if (actionProduct) {
      setActionMenuIdx(0);
      setTimeout(() => actionMenuRef.current?.focus(), 30);
    }
  }, [actionProduct]);

  // ── Helpers ─────────────────────────────────────────────────────────────
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
    // Close menu and clear row selection immediately, THEN run the action
    setActionProduct(null);
    setSelectedIndex(-1);
    // Use setTimeout so state flush happens before confirm dialogs or
    // modal opens — prevents UI from feeling "stuck"
    setTimeout(() => {
      if (key === 'edit')   onEdit(product);
      if (key === 'print')  onPrintBarcode({ ...product, final_price: getFinalPrice(product) });
      if (key === 'delete') onDelete(product.id);
    }, 0);
  }, [onEdit, onPrintBarcode, onDelete]);

  // ── Global keyboard handler ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // If action menu is open, handle its navigation
      if (actionProduct) return; // handled by menu's own keydown

      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+F or / → focus search
      if ((e.ctrlKey && e.key === 'f') || (!isTyping && e.key === '/')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // Arrow navigation only when not typing in search
      if (isTyping) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
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

  // ── Action menu keyboard ─────────────────────────────────────────────────
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
      // Shortcut keys
      const opt = ACTION_MENU_OPTIONS.find(o => o.shortcut === e.key.toUpperCase());
      if (opt) dispatchAction(opt.key, actionProduct);
    }
  };

  // ── Search field keyboard ────────────────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(0);
      tableRef.current?.querySelector("tbody tr[data-row]")?.focus();
    }
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

          {/* Search — takes most of the width */}
          <div className="relative flex-1 min-w-0 w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, barcode or short form…  (Ctrl+F or /)"
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

          {/* Filters + count — compact right side */}
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
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Esc</kbd> deselect
        </p>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['ID','Barcode','Item','Prices (LKR)','Stock','Discount','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
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
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {searchTerm || filterCredit ? 'No matching products found' : 'No products added yet'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, idx) => {
                const stockStatus = getStockStatus(product.stock_quantity);
                const finalPrice  = getFinalPrice(product);
                const isSelected  = idx === selectedIndex;

                return (
                  <tr
                    key={product.id}
                    data-row
                    tabIndex={0}
                    onClick={() => {
                      setSelectedIndex(idx);
                    }}
                    onDoubleClick={() => {
                      setSelectedIndex(idx);
                      setActionProduct(product);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { setActionProduct(product); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(Math.min(idx+1, filteredProducts.length-1)); }
                      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(Math.max(idx-1, 0)); }
                      if (e.key === 'Escape')     { setSelectedIndex(-1); }
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
                        #{product.id}
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
                          className="text-primary-600 hover:text-primary-700 text-xs focus:outline-none"
                          title="View Barcode"
                          tabIndex={-1}
                        >
                          👁️
                        </button>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{product.item_name}</p>
                      {product.short_form && (
                        <p className="text-xs text-gray-500">{product.short_form}</p>
                      )}
                      {product.company && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {product.company}
                        </span>
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
                        >✏️</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPrintBarcode({ ...product, final_price: finalPrice }); }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print Barcode (P)"
                          tabIndex={-1}
                        >🖨️</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete (D)"
                          tabIndex={-1}
                        >🗑️</button>
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
              <code className="text-xs text-gray-500 font-mono">{actionProduct.barcode}</code>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {ACTION_MENU_OPTIONS.map((opt, i) => (
                <button
                  key={opt.key}
                  onClick={() => dispatchAction(opt.key, actionProduct)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                    ${actionMenuIdx === i
                      ? `${opt.color} ring-2 ring-offset-1 ring-current scale-[1.01]`
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="flex-1 text-left">{opt.label}</span>
                  <kbd className="text-xs px-1.5 py-0.5 bg-white/70 rounded border border-current opacity-60">
                    {opt.shortcut}
                  </kbd>
                </button>
              ))}
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
            <BarcodeGenerator
              barcode={previewProduct.barcode}
              item_name={previewProduct.item_name}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;