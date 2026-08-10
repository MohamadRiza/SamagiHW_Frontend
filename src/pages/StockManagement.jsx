import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import ProductForm from '../components/stock/ProductForm';
import ProductTable from '../components/stock/ProductTable';
import { Toaster, toast } from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { FaPlus, FaEdit, FaExclamationTriangle } from 'react-icons/fa';

const StockManagement = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [formLoading, setFormLoading]       = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const modalRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAll();
      if (response.success) setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Open / close modal ─────────────────────────────────────────────────
  const openAddForm = useCallback(() => {
    setEditingProduct(null);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
  }, []);

  // ── Ctrl+Alt+N shortcut ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (isAdmin()) openAddForm();
      }
      if (e.key === 'Escape' && showForm) closeForm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdmin, openAddForm, closeForm, showForm]);

  // ── CRUD ───────────────────────────────────────────────────────────────
  const handleSubmit = async (productData) => {
    try {
      setFormLoading(true);
      if (editingProduct) {
        const response = await ProductService.update(editingProduct.id, productData);
        if (response.success) {
          toast.success('Product updated successfully');
          setEditingProduct(null);
        }
      } else {
        const response = await ProductService.create(productData);
        if (response.success) toast.success('Product added successfully');
      }
      closeForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
      console.error('Submit error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await ProductService.delete(id);
      if (response.success) {
        toast.success('Product deleted');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Failed to delete product');
      console.error('Delete error:', error);
    }
  };

  // ── Barcode Print ──────────────────────────────────────────────────────
  // Shows REAL selling_price on label (not discounted), uses sub_brands,
  // company left-aligned and #ID right-aligned in the header row.
  const handlePrintBarcode = (product) => {
    // ✅ Use REAL selling_price on the label — NOT the discounted price
    const realPrice = product.selling_price || 0;

    // Generate real Code128 barcode image
    const generateRealBarcode = (code) => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, code, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: false,
          fontSize: 0,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(code, canvas.width / 2, canvas.height / 2);
      }
      return canvas.toDataURL('image/png');
    };

    const barcodeImage = generateRealBarcode(product.barcode);

    const formattedPrice = new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(realPrice);

    // sub_brands: comma-separated compatible brands, up to 4, max 20 chars each
    const brandLines = (product.sub_brands || '')
      .split(',')
      .map((s) => s.trim().slice(0, 20))
      .filter(Boolean)
      .slice(0, 4);

    const brandsHTML = brandLines
      .map((line) => `<div class="brand-line">${line}</div>`)
      .join('');

    const displayName = product.item_name || '';
    const idLabel = product.id ? `#${product.id}` : '';

    const printWindow = window.open('', '_blank', 'width=300,height=200');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${product.barcode}</title>
        <style>
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: 50mm;
            height: 30mm;
            overflow: hidden;
            background: #fff;
            color: #000;
            font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
          }
          .label {
            width: 50mm;
            height: 30mm;
            padding: 1.2mm 1.5mm 1mm 1.5mm;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          /* ── Row 1: Company (left) + #ID (right) ── */
          .header-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 0.8mm;
            border-bottom: 0.25mm solid #000;
            flex-shrink: 0;
            line-height: 1;
          }
          .company-name {
            font-size: 5.5pt;
            font-weight: 700;
            letter-spacing: 0.2px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
          }
          .primary-id {
            font-size: 5.5pt;
            font-weight: 700;
            white-space: nowrap;
            flex-shrink: 0;
            margin-left: 2mm;
          }

          /* ── Row 2: Item name ── */
          .item-name-row {
            text-align: center;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.1;
            padding: 0.6mm 0 0.4mm 0;
            flex-shrink: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* ── Row 3: Barcode ── */
          .barcode-row {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .barcode-img {
            width: 100%;
            height: 10mm;
            object-fit: fill;
            image-rendering: pixelated;
            display: block;
          }
          .barcode-num {
            font-family: 'Courier New', Courier, monospace;
            font-size: 5.5pt;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-align: center;
            margin-top: 0.3mm;
            line-height: 1;
          }

          /* ── Row 4: Brands (left) + Price (right) ── */
          .bottom-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
            flex: 1;
            padding-top: 0.8mm;
            min-height: 0;
            overflow: hidden;
          }
          .brands-col {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-start;
            flex: 1;
            min-width: 0;
            overflow: hidden;
          }
          .brand-line {
            font-size: 5pt;
            font-weight: 500;
            color: #000;
            line-height: 1.25;
            white-space: nowrap;
          }
          .price-block {
            flex-shrink: 0;
            text-align: right;
            line-height: 1;
          }
          .price-label {
            font-size: 5.5pt;
            font-weight: 700;
            color: #000;
            white-space: nowrap;
          }
          .price-amount {
            font-size: 10pt;
            font-weight: 800;
            color: #000;
            white-space: nowrap;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="label">

          <!-- Row 1: Company (left) + #ID (right) -->
          <div class="header-row">
            <div class="company-name">SAMAGI MOTORS &ndash; KUMBUKGATE</div>
            <div class="primary-id">${idLabel}</div>
          </div>

          <!-- Row 2: Item Name -->
          <div class="item-name-row">${displayName}</div>

          <!-- Row 3: Barcode -->
          <div class="barcode-row">
            <img src="${barcodeImage}" class="barcode-img" alt="barcode" />
            <div class="barcode-num">${product.barcode}</div>
          </div>

          <!-- Row 4: Brands + Price -->
          <div class="bottom-row">
            <div class="brands-col">
              ${brandsHTML}
            </div>
            <div class="price-block">
              <span class="price-label">LKR</span>
              <span class="price-amount">${formattedPrice}</span>
            </div>
          </div>

        </div>

        <script>
          window.onload = function () {
            setTimeout(() => { window.print(); }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const canEdit = isAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Sidebar />

      <main className="flex-1 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
              <p className="text-gray-500 text-sm">Manage products, inventory, and pricing</p>
            </div>
            {canEdit && (
              <button
                onClick={openAddForm}
                className="btn-primary flex items-center gap-2 shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                title="Add New Product (Ctrl+Alt+N)"
              >
                <FaPlus className="w-3.5 h-3.5" />
                Add New Product
                <kbd className="ml-1 text-xs opacity-60 bg-white/20 px-1.5 py-0.5 rounded">
                  Ctrl+Alt+N
                </kbd>
              </button>
            )}
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="p-6">
          <ProductTable
            products={products}
            onEdit={(product) => {
              if (!canEdit) {
                toast.error('Admin access required to edit products');
                return;
              }
              setEditingProduct(product);
              setShowForm(true);
            }}
            onDelete={canEdit ? handleDelete : undefined}
            onPrintBarcode={handlePrintBarcode}
            loading={loading}
          />

          {/* Low Stock Alert */}
          {products.some((p) => p.stock_quantity <= 10 && p.stock_quantity > 0) && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <FaExclamationTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Low Stock Alert:</strong>{' '}
                  {products.filter((p) => p.stock_quantity <= 10 && p.stock_quantity > 0).length} items
                  are running low. Consider restocking soon.
                </span>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200 outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={editingProduct ? 'Edit Product' : 'Add New Product'}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {editingProduct ? (
                    <>
                      <FaEdit className="text-primary-600" />
                      <span>Edit Product</span>
                    </>
                  ) : (
                    <>
                      <FaPlus className="text-primary-600" />
                      <span>Add New Product</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingProduct
                    ? `Editing: ${editingProduct.item_name}`
                    : 'Fill in the details below'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                title="Close (Esc)"
                tabIndex={0}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[75vh]">
              <ProductForm
                product={editingProduct}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;