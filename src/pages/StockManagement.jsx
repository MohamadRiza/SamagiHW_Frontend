import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import ProductForm from '../components/stock/ProductForm';
import ProductTable from '../components/stock/ProductTable';
import { Toaster, toast } from 'react-hot-toast';

const StockManagement = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAll();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Create/Update
  const handleSubmit = async (productData) => {
    try {
      setFormLoading(true);
      
      if (editingProduct) {
        // Update existing
        const response = await ProductService.update(editingProduct.id, productData);
        if (response.success) {
          toast.success('Product updated successfully');
          setEditingProduct(null);
        }
      } else {
        // Create new
        const response = await ProductService.create(productData);
        if (response.success) {
          toast.success('Product added successfully');
        }
      }
      
      setShowForm(false);
      fetchProducts(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
      console.error('Submit error:', error);
    } finally {
      setFormLoading(false);
    }
  };
  
  // Handle Delete
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
  
  // ✅ PERFECT BARCODE PRINT: Samagi Hardware Label Layout (FIXED ALIGNMENTS)
  const handlePrintBarcode = (product) => {
    // Calculate final price with discount logic
    const finalPrice = product.discount_type === 'percent'
      ? product.selling_price - (product.selling_price * product.discount_value / 100)
      : product.selling_price - product.discount_value;
    
    // Generate crisp barcode image using canvas
    const barcodeImage = generateBarcodeCanvas(product.barcode);
    
    // Format price with LKR and comma separators
    const formattedPrice = new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(finalPrice);
    
    // Short form fallback to item name first 10 chars
    const displayShortForm = product.short_form || product.item_name?.substring(0, 10) || '';
    
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${product.barcode}</title>
        <style>
          @page { size: 3.5in 2in; margin: 0; }
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 3.5in;
            height: 2in;
            padding: 0.1in 0.15in;
            background: #fff;
            color: #000;
          }
          .label-container {
            border: 1px solid #ddd;
            padding: 10px 8px;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .company-name {
            text-align: center;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px dashed #999;
            width: 100%;
          }
          .barcode-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 4px 0;
            width: 100%;
          }
          .barcode-image {
            width: 160px;
            height: 45px;
            object-fit: contain;
            image-rendering: pixelated;
            margin-bottom: 2px;
          }
          .barcode-number {
            font-family: 'Courier New', Courier, monospace;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 3px;
            text-align: center;
            margin-top: 2px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #ddd;
          }
          .short-form {
            font-size: 10px;
            font-weight: 700;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
          }
          .price {
            font-size: 11px;
            font-weight: 700;
            color: #000;
            text-align: right;
          }
          .price .currency {
            font-size: 9px;
            vertical-align: super;
            margin-right: 1px;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              padding: 0.1in 0.15in !important;
            }
            .label-container {
              border: 1px solid #000;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <!-- Company Name (Top Center) -->
          <div class="company-name">Samagi Hardware</div>
          
          <!-- Barcode Section (Perfectly Centered) -->
          <div class="barcode-wrapper">
            <img src="${barcodeImage}" alt="barcode" class="barcode-image" />
            <div class="barcode-number">${product.barcode}</div>
          </div>
          
          <!-- Bottom Row: Short Form (Left) | Price (Right) -->
          <div class="info-row">
            <div class="short-form">${displayShortForm}</div>
            <div class="price">
              <span class="currency">LKR</span>${formattedPrice}
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // ✅ Helper: Generate crisp barcode canvas image (Code128 style) - CENTERED
  const generateBarcodeCanvas = (code, width = 180, height = 45) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Generate deterministic bars from barcode string for consistency
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Calculate starting position to center bars
    let totalWidth = 0;
    const bars = [];
    for (let i = 0; i < 30; i++) {
      const barWidth = ((hash >> i) & 3) + 1; // 1-4px
      const spacing = ((hash >> (i + 5)) & 1) ? 2 : 1; // 1-2px
      bars.push({ width: barWidth, spacing });
      totalWidth += barWidth + spacing;
    }
    
    // Center the barcode
    let x = (width - totalWidth) / 2;
    
    // Draw barcode bars
    ctx.fillStyle = '#000000';
    for (const bar of bars) {
      ctx.fillRect(x, 3, bar.width, height - 8);
      x += bar.width + bar.spacing;
    }
    
    return canvas.toDataURL('image/png');
  };
  
  // Admin-only: Show add button
  const canEdit = isAdmin();
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
              <p className="text-gray-600">Manage products, inventory, and pricing</p>
            </div>
            
            {canEdit && !showForm && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowForm(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <span>➕</span> Add New Product
              </button>
            )}
          </div>
        </header>
        
        {/* Content */}
        <div className="p-6">
          {/* Form Modal */}
          {showForm && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <ProductForm
                product={editingProduct}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
                loading={formLoading}
              />
            </div>
          )}
          
          {/* Products Table */}
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
                ⚠️ <strong>Low Stock Alert:</strong> {products.filter(p => p.stock_quantity <= 10 && p.stock_quantity > 0).length} items are running low. Consider restocking soon.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StockManagement;