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
  
  // Handle Print Barcode
  const handlePrintBarcode = (product) => {
    // Trigger print via the BarcodeGenerator component
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Print Barcode</title>
      <style>
        body{font-family:monospace;text-align:center;padding:20px}
        .barcode{display:inline-block;margin:20px 0}
        .bar{display:inline-block;background:#000;height:50px;margin-right:1px}
        .barcode-text{font-size:14px;font-weight:bold;margin-top:5px}
        .item-name{font-size:12px;color:#666;margin-bottom:10px}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <div class="item-name">${product.item_name}</div>
        <div class="barcode">
          ${generateBars(product.barcode).map(bar => 
            `<div class="bar" style="width:${bar.width}px;margin-right:${bar.spacing}px"></div>`
          ).join('')}
        </div>
        <div class="barcode-text">${product.barcode}</div>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Helper: Generate barcode bars (same as BarcodeGenerator)
  const generateBars = (code) => {
    const bars = [];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < 30; i++) {
      const width = ((hash >> i) & 3) + 1;
      const spacing = ((hash >> (i + 5)) & 1) ? 2 : 1;
      bars.push({ width, spacing, key: i });
    }
    return bars;
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