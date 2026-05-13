import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import ProductForm from '../components/stock/ProductForm';
import ProductTable from '../components/stock/ProductTable';
import { Toaster, toast } from 'react-hot-toast';

const StockManagement = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [formLoading, setFormLoading]     = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const modalRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchProducts();
  }, []);

  // ── Open / close modal ─────────────────────────────────────────────────
  const openAddForm = useCallback(() => {
    setEditingProduct(null);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
  }, []);

  // ── Ctrl+Alt+N shortcut ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (isAdmin()) openAddForm();
      }
      // Escape closes modal
      if (e.key === 'Escape' && showForm) {
        closeForm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdmin, openAddForm, closeForm, showForm]);

  // ── CRUD ──────────────────────────────────────────────────────────────
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

  // ── Barcode Print ─────────────────────────────────────────────────────
  const handlePrintBarcode = (product) => {
    const finalPrice = product.discount_type === 'percent'
      ? product.selling_price - (product.selling_price * product.discount_value / 100)
      : product.selling_price - product.discount_value;

    const barcodeImage = generateBarcodeCanvas(product.barcode);

    const formattedPrice = new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(finalPrice);

    const displayShortForm = product.short_form || product.item_name?.substring(0, 10) || '';

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${product.barcode}</title>
        <style>
          @page { size: 3.5in 2in; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 3.5in; height: 2in;
            padding: 0.1in 0.15in;
            background: #fff; color: #000;
          }
          .label-container {
            border: 1px solid #ddd; padding: 10px 8px; height: 100%;
            display: flex; flex-direction: column; align-items: center;
          }
          .company-name {
            text-align: center; font-weight: 700; font-size: 12px;
            letter-spacing: 1px; text-transform: uppercase;
            margin-bottom: 6px; padding-bottom: 4px;
            border-bottom: 1px dashed #999; width: 100%;
          }
          .barcode-wrapper {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            margin: 4px 0; width: 100%;
          }
          .barcode-image { width: 160px; height: 45px; object-fit: contain; image-rendering: pixelated; margin-bottom: 2px; }
          .barcode-number {
            font-family: 'Courier New', Courier, monospace;
            font-weight: 700; font-size: 11px; letter-spacing: 3px;
            text-align: center; margin-top: 2px;
          }
          .info-row {
            display: flex; justify-content: space-between; align-items: center;
            width: 100%; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;
          }
          .short-form { font-size: 10px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.5px; }
          .price { font-size: 11px; font-weight: 700; color: #000; text-align: right; }
          .price .currency { font-size: 9px; vertical-align: super; margin-right: 1px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0.1in 0.15in !important; }
            .label-container { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="company-name">Samagi Hardware</div>
          <div class="barcode-wrapper">
            <img src="${barcodeImage}" alt="barcode" class="barcode-image" />
            <div class="barcode-number">${product.barcode}</div>
          </div>
          <div class="info-row">
            <div class="short-form">${displayShortForm}</div>
            <div class="price"><span class="currency">LKR</span>${formattedPrice}</div>
          </div>
        </div>
        <script>window.onload = function() { setTimeout(() => window.print(), 300); };<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateBarcodeCanvas = (code, width = 180, height = 45) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }

    let totalWidth = 0;
    const bars = [];
    for (let i = 0; i < 30; i++) {
      const barWidth = ((hash >> i) & 3) + 1;
      const spacing = ((hash >> (i + 5)) & 1) ? 2 : 1;
      bars.push({ width: barWidth, spacing });
      totalWidth += barWidth + spacing;
    }

    let x = (width - totalWidth) / 2;
    ctx.fillStyle = '#000000';
    for (const bar of bars) {
      ctx.fillRect(x, 3, bar.width, height - 8);
      x += bar.width + bar.spacing;
    }

    return canvas.toDataURL('image/png');
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
                <span>➕</span>
                Add New Product
                <kbd className="ml-1 text-xs opacity-60 bg-white/20 px-1.5 py-0.5 rounded">Ctrl+Alt+N</kbd>
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
          {products.some(p => p.stock_quantity <= 10 && p.stock_quantity > 0) && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ⚠️ <strong>Low Stock Alert:</strong>{' '}
                {products.filter(p => p.stock_quantity <= 10 && p.stock_quantity > 0).length} items are running low.
                Consider restocking soon.
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={editingProduct ? 'Edit Product' : 'Add New Product'}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingProduct ? `Editing: ${editingProduct.item_name}` : 'Fill in the details below'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                title="Close (Esc)"
                tabIndex={0}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
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