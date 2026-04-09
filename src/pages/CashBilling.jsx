import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import BillService from '../services/bill.service';
import { Toaster, toast } from 'react-hot-toast';

// 🔊 Professional scan sound
const playScanSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
};

const CashBilling = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [highlightRow, setHighlightRow] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [barcodeScannerMode, setBarcodeScannerMode] = useState(false);
  
  const searchInputRef = useRef(null);
  const cartContainerRef = useRef(null);
  const suggestionRefs = useRef([]);

  // ✅ FIX: Calculate totals with useMemo (runs after render, safe for hooks)
  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
      const itemTotal = item.unit_price * item.quantity;
      const itemDiscount = item.discount_lkr * item.quantity;
      totalAmount += itemTotal;
      totalDiscount += itemDiscount;
    });
    
    return {
      totalAmount,
      totalDiscount,
      grandTotal: Math.max(0, totalAmount - totalDiscount),
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cart]);
  
  // Destructure AFTER useMemo (safe now)
  const { totalAmount, totalDiscount, grandTotal, itemCount } = totals;

  // 🔍 Debounced product search
  useEffect(() => {
    if (barcodeScannerMode) return;
    
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
      
      try {
        const response = await ProductService.getAll({ search: searchQuery });
        if (response.success) {
          const filtered = response.data.filter(p => p.stock_quantity > 0).slice(0, 8);
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, barcodeScannerMode]);

  // 🎯 Keyboard Navigation for Suggestions
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Global shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      }
      
      // Suggestion navigation
      if (!showSuggestions || suggestions.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const next = prev < suggestions.length - 1 ? prev + 1 : prev;
          suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        if (suggestions[selectedSuggestionIndex]) {
          addToCart(suggestions[selectedSuggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        if (!barcodeScannerMode) {
          setSearchQuery('');
        }
        searchInputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, selectedSuggestionIndex, barcodeScannerMode, cart, paymentMethod]);
  // ✅ FIX: Removed grandTotal from deps since it's derived from cart

  // 🛒 Add product to cart
  const addToCart = useCallback((product) => {
    if (!product) return;
    
    if (product.stock_quantity <= 0) {
      toast.error(`❌ Out of stock: ${product.item_name}`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > product.stock_quantity) {
          toast.error(`⚠️ Max stock reached: ${product.stock_quantity}`);
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      
      const autoDiscount = product.discount_type === 'percent'
        ? product.selling_price * product.discount_value / 100
        : product.discount_value;
      
      return [...prev, {
        product_id: product.id,
        product_name: product.item_name,
        barcode: product.barcode,
        short_form: product.short_form,
        unit_price: product.selling_price,
        quantity: 1,
        max_stock: product.stock_quantity,
        discount_mode: 'default',
        discount_value: product.discount_value || 0,
        discount_type: product.discount_type || 'fixed',
        auto_discount_lkr: autoDiscount,
        discount_lkr: autoDiscount
      }];
    });
    
    playScanSound();
    setHighlightRow(product.id);
    setTimeout(() => setHighlightRow(null), 800);
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    if (!barcodeScannerMode) {
      searchInputRef.current?.focus();
    }
  }, [barcodeScannerMode]);

  // 📦 Handle barcode scan / Enter key
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (barcodeScannerMode) {
      try {
        const response = await ProductService.getAll({ search: searchQuery.trim() });
        if (response.success && response.data.length > 0) {
          const exactMatch = response.data.find(p => 
            p.barcode === searchQuery.trim() || 
            p.short_form?.toUpperCase() === searchQuery.trim().toUpperCase()
          );
          if (exactMatch) {
            addToCart(exactMatch);
            setSearchQuery('');
            return;
          }
        }
        toast.error('❌ Product not found');
        setSearchQuery('');
      } catch (error) {
        console.error('Barcode lookup error:', error);
        setSearchQuery('');
      }
      return;
    }
    
    try {
      const response = await ProductService.getAll({ search: searchQuery.trim() });
      if (response.success && response.data.length > 0) {
        const exactMatch = response.data.find(p => 
          p.barcode === searchQuery.trim() || 
          p.short_form?.toUpperCase() === searchQuery.trim().toUpperCase()
        );
        if (exactMatch) {
          addToCart(exactMatch);
          return;
        }
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
    }
    
    if (suggestions.length > 0) {
      addToCart(suggestions[selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0]);
    }
  };

  // Handle input change with barcode scanner mode check
  const handleSearchChange = (e) => {
    if (barcodeScannerMode) {
      const value = e.target.value;
      setSearchQuery(value);
      if (value.endsWith('\n')) {
        setSearchQuery(value.replace(/\n$/, ''));
        handleSearchSubmit(e);
      }
    } else {
      setSearchQuery(e.target.value);
    }
  };

  // 🔄 Update cart item fields
  const updateCartItem = (productId, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      
      let updated = { ...item };
      
      if (field === 'quantity') {
        const qty = parseInt(value) || 0;
        if (qty <= 0) {
          toast.error('⚠️ Quantity must be at least 1');
          return item;
        }
        if (qty > item.max_stock) {
          toast.error(`⚠️ Max stock: ${item.max_stock}`);
          return item;
        }
        updated.quantity = qty;
      } else if (field === 'discount_mode') {
        updated.discount_mode = value;
        if (value === 'default') {
          updated.discount_lkr = item.auto_discount_lkr;
          updated.discount_value = item.discount_value;
          updated.discount_type = item.discount_type;
        } else if (value === 'percent') {
          updated.discount_value = 0;
          updated.discount_lkr = 0;
          updated.discount_type = 'percent';
        } else if (value === 'fixed') {
          updated.discount_value = 0;
          updated.discount_lkr = 0;
          updated.discount_type = 'fixed';
        }
      } else if (field === 'discount_value') {
        const val = parseFloat(value) || 0;
        if (val < 0) {
          toast.error('⚠️ Discount cannot be negative');
          return item;
        }
        
        updated.discount_value = val;
        
        if (updated.discount_mode === 'percent') {
          if (val > 100) {
            toast.error('⚠️ Discount cannot exceed 100%');
            updated.discount_value = 100;
            updated.discount_lkr = item.unit_price;
          } else {
            updated.discount_lkr = item.unit_price * val / 100;
          }
        } else if (updated.discount_mode === 'fixed') {
          if (val > item.unit_price) {
            toast.error('⚠️ Discount cannot exceed unit price');
            updated.discount_value = item.unit_price;
            updated.discount_lkr = item.unit_price;
          } else {
            updated.discount_lkr = val;
          }
        }
      }
      
      return updated;
    }));
  };

  // 🗑️ Remove from cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  // 🧹 Clear cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('🗑️ Clear all items from cart?')) {
      setCart([]);
      setPaymentMethod(null);
      toast.success('Cart cleared');
    }
  };

  // 🖨️ Print Bill & Save to DB
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('❌ Cart is empty');
      return;
    }
    if (!paymentMethod) {
      toast.error('❌ Please select payment method (CASH or CARD)');
      return;
    }
    if (grandTotal <= 0) {
      toast.error('❌ Invalid bill total');
      return;
    }
    
    setProcessing(true);
    try {
      const billItems = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount_lkr: item.discount_lkr
      }));
      
      const response = await BillService.create(billItems, paymentMethod);
      
      if (response.success) {
        toast.success(`✅ Bill #${response.data.billNumber} saved!`);
        openReceiptPrint(response.data, cart, paymentMethod);
        setCart([]);
        setPaymentMethod(null);
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        searchInputRef.current?.focus();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || '❌ Billing failed');
      console.error('Checkout error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // 🧾 Professional Receipt Print Layout
  const openReceiptPrint = (billData, cartItems, paymentMethod) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${billData.billNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; font-size: 11px; padding: 8px; margin: 0; background: #fff; color: #000; }
          .header { text-align: center; margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 8px; }
          .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
          .header p { margin: 2px 0; font-size: 10px; }
          .bill-info { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 10px; font-weight: bold; }
          td { padding: 3px 0; font-size: 10px; vertical-align: top; }
          .totals { border-top: 2px dashed #000; padding-top: 6px; margin-top: 6px; }
          .totals div { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
          .grand-total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          .payment-info { text-align: center; margin: 8px 0; padding: 4px; background: #f0f0f0; font-weight: bold; }
          .footer { text-align: center; margin-top: 12px; font-size: 9px; border-top: 1px dashed #000; padding-top: 6px; }
          .audit { font-size: 8px; color: #666; margin-top: 8px; text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SAMAGI HARDWARE</h2>
          <p>POS System - ${paymentMethod} Bill</p>
          <p>${new Date().toLocaleString('en-LK')}</p>
        </div>
        <div class="bill-info">
          <span>Bill #: ${billData.billNumber}</span>
          <span>Cashier: ${billData.cashier}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:45%">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Disc</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cartItems.map(item => `
              <tr>
                <td>${item.product_name}<br><span style="font-size:9px;color:#666">${item.barcode}</span></td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">${item.unit_price.toFixed(2)}</td>
                <td style="text-align:right;color:red">${item.discount_lkr > 0 ? '-' + (item.discount_lkr * item.quantity).toFixed(2) : '-'}</td>
                <td style="text-align:right;font-weight:bold">${((item.unit_price * item.quantity) - (item.discount_lkr * item.quantity)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal:</span><span>LKR ${totalAmount.toFixed(2)}</span></div>
          <div style="color:red"><span>Discount:</span><span>- LKR ${totalDiscount.toFixed(2)}</span></div>
          <div class="grand-total"><span>TOTAL:</span><span>LKR ${grandTotal.toFixed(2)}</span></div>
          <div class="payment-info">PAYMENT: ${paymentMethod}</div>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>Goods once sold cannot be returned</p>
        </div>
        <div class="audit">
          Audit: ${billData.billNumber} | ${new Date().toISOString()} | Cashier: ${billData.cashier}
        </div>
        <script>
          window.onload = () => { setTimeout(() => window.print(), 300); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Format LKR
  const formatLKR = (amount) => `LKR ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Professional Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl shadow-lg">
                💰
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cash Billing</h1>
                <p className="text-sm text-gray-500">Fast, secure, and professional POS</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          
          {/* LEFT: Search + Cart (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* Professional Search Bar with Barcode Scanner Mode */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 relative">
              {/* Barcode Scanner Mode Toggle */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={barcodeScannerMode}
                      onChange={(e) => {
                        setBarcodeScannerMode(e.target.checked);
                        setSearchQuery('');
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                        if (e.target.checked) {
                          searchInputRef.current?.focus();
                          toast.success('📷 Barcode Scanner Mode Activated');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors">
                      📷 Barcode Scanner Mode
                    </span>
                    <span className="text-xs text-gray-500">
                      {barcodeScannerMode ? 'Auto-add on scan • Manual typing disabled' : 'Type to search products'}
                    </span>
                  </div>
                </label>
                
                {barcodeScannerMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">Ready to Scan</span>
                  </div>
                )}
              </div>
              
              {/* Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder={barcodeScannerMode ? "🔍 Scan barcode now..." : "🔍 Search by name, barcode, or short form..."}
                      readOnly={barcodeScannerMode}
                      className={`w-full pl-12 pr-24 py-4 text-lg bg-gray-50 border-2 rounded-xl focus:outline-none transition-all ${
                        barcodeScannerMode
                          ? 'border-green-300 bg-green-50/30 cursor-not-allowed'
                          : 'border-gray-200 focus:border-primary-500 focus:bg-white'
                      }`}
                      autoComplete="off"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      {barcodeScannerMode ? (
                        <svg className="w-6 h-6 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <kbd className="hidden sm:inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono font-semibold text-gray-600">
                        ESC
                      </kbd>
                    </div>
                  </div>
                  
                  {!barcodeScannerMode && (
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="px-6 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              </form>
              
              {/* Keyboard Instructions */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">ESC</kbd>
                  Cancel
                </span>
              </div>
              
              {/* Auto-suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                  {suggestions.map((product, index) => (
                    <button
                      key={product.id}
                      ref={el => suggestionRefs.current[index] = el}
                      onClick={() => addToCart(product)}
                      className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 flex justify-between items-center transition-all group ${
                        index === selectedSuggestionIndex
                          ? 'bg-primary-100 border-l-4 border-l-primary-600'
                          : 'hover:bg-primary-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${index === selectedSuggestionIndex ? 'text-primary-700' : 'text-gray-900 group-hover:text-primary-700'}`}>
                            {product.item_name}
                          </p>
                          {product.discount_value > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              -{product.discount_value}{product.discount_type === 'percent' ? '%' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{product.barcode}</span>
                          {product.short_form && <span className="ml-2">• {product.short_form}</span>}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-primary-700 text-lg">{formatLKR(product.selling_price)}</p>
                        <p className="text-xs text-gray-500">Stock: <span className={product.stock_quantity <= 10 ? 'text-red-600 font-medium' : 'text-green-600'}>{product.stock_quantity}</span></p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cart Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex-1 overflow-hidden flex flex-col">
              {/* Cart Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                    {itemCount}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Cart Items</h3>
                </div>
                <button 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All (F4)
                </button>
              </div>
              
              {/* Cart Content */}
              <div className="flex-1 overflow-auto" ref={cartContainerRef}>
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                    <div className="text-7xl mb-4 opacity-30">🛒</div>
                    <p className="text-lg font-semibold text-gray-600">Cart is empty</p>
                    <p className="text-sm mt-2 text-gray-500">
                      {barcodeScannerMode ? 'Scan a barcode to add items' : 'Search products or scan barcode to add items'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-40">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Subtotal</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cart.map((item, index) => (
                        <tr 
                          key={item.product_id} 
                          className={`transition-all duration-200 ${
                            highlightRow === item.product_id 
                              ? 'bg-primary-50 ring-2 ring-primary-500/30' 
                              : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } hover:bg-blue-50/50`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0 shadow-sm">
                                {item.product_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{item.product_name}</p>
                                <p className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 rounded">{item.barcode}</p>
                                {item.short_form && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                      {item.short_form}
                                    </span>
                                  </div>
                                )}
                                {item.discount_lkr > 0 && (
                                  <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                    ✓ Auto Discount: {formatLKR(item.discount_lkr)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Quantity */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max={item.max_stock}
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.product_id, 'quantity', e.target.value)}
                                className="w-20 text-center border-2 border-gray-200 rounded-xl py-2 font-bold text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                              />
                              <p className="text-[10px] text-gray-400">Max: {item.max_stock}</p>
                            </div>
                          </td>
                          
                          {/* Unit Price */}
                          <td className="px-4 py-4 text-right font-bold text-gray-900">
                            {formatLKR(item.unit_price)}
                          </td>
                          
                          {/* Discount Controls */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <select
                                value={item.discount_mode}
                                onChange={(e) => updateCartItem(item.product_id, 'discount_mode', e.target.value)}
                                className="w-full text-xs border-2 border-gray-200 rounded-lg py-2 px-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                              >
                                <option value="default">🤖 Default (Auto)</option>
                                <option value="percent">📊 Manual %</option>
                                <option value="fixed">💵 Manual LKR</option>
                              </select>
                              
                              <div className="relative w-full">
                                <input
                                  type="number"
                                  min="0"
                                  step={item.discount_mode === 'percent' ? "1" : "0.01"}
                                  max={item.discount_mode === 'percent' ? "100" : item.unit_price}
                                  value={item.discount_value}
                                  onChange={(e) => updateCartItem(item.product_id, 'discount_value', e.target.value)}
                                  disabled={item.discount_mode === 'default'}
                                  className={`w-full text-right border-2 rounded-lg py-2 font-medium transition-all pl-8 ${
                                    item.discount_mode === 'default'
                                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                  }`}
                                  placeholder={item.discount_mode === 'percent' ? '0%' : '0.00'}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                  {item.discount_mode === 'percent' ? '%' : 'Rs'}
                                </span>
                              </div>
                              
                              {item.discount_lkr > 0 && (
                                <p className="text-[10px] text-green-600 font-bold">
                                  Saved: {formatLKR(item.discount_lkr * item.quantity)}
                                </p>
                              )}
                            </div>
                          </td>
                          
                          {/* Subtotal */}
                          <td className="px-4 py-4 text-right font-black text-primary-700 text-xl">
                            {formatLKR((item.unit_price * item.quantity) - (item.discount_lkr * item.quantity))}
                          </td>
                          
                          {/* Action */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all hover:shadow-md"
                              title="Remove Item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          
          {/* RIGHT: Summary & Checkout (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
              
              {/* Bill Summary Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Bill Summary</h3>
                  <p className="text-xs text-gray-500">{itemCount} items in cart</p>
                </div>
              </div>
              
              {/* Totals */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600 p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="font-bold text-lg">{formatLKR(totalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center text-green-600 p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-sm font-medium">Total Discount</span>
                  <span className="font-bold text-lg">- {formatLKR(totalDiscount)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center shadow-lg">
                    <p className="text-sm font-semibold">
                      🎉 Customer Saved: <strong>{formatLKR(totalDiscount)}</strong>
                    </p>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <span className="text-4xl font-black text-primary-700">{formatLKR(grandTotal)}</span>
                </div>
              </div>
              
              {/* Payment Method Selection - REQUIRED */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'CASH'
                        ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-3xl">💵</span>
                    <span className={`font-bold text-sm ${paymentMethod === 'CASH' ? 'text-green-700' : 'text-gray-700'}`}>
                      CASH
                    </span>
                    {paymentMethod === 'CASH' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'CARD'
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-3xl">💳</span>
                    <span className={`font-bold text-sm ${paymentMethod === 'CARD' ? 'text-blue-700' : 'text-gray-700'}`}>
                      CARD
                    </span>
                    {paymentMethod === 'CARD' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
                {!paymentMethod && (
                  <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Please select payment method to proceed</span>
                  </p>
                )}
              </div>
              
              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={processing || cart.length === 0 || grandTotal <= 0 || !paymentMethod}
                className={`w-full py-4 font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 mb-4 ${
                  processing || cart.length === 0 || grandTotal <= 0 || !paymentMethod
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Bill & Save (F9)
                  </>
                )}
              </button>
              
              {/* Security Badge */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 3.04A12.02 12.02 0 0112 5.5c0 3.037-1.15 5.776-3.04 7.618" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Transaction Secured</p>
                    <p className="text-xs text-gray-600 mt-1">
                      All sales logged with cashier ID, timestamp & payment method. Stock deducted after billing.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Keyboard Shortcuts */}
              <div className="pt-4 border-t-2 border-gray-100">
                <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Keyboard Shortcuts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'F2', label: 'Focus Search', icon: '🔍', color: 'blue' },
                    { key: 'F4', label: 'Clear Cart', icon: '🗑️', color: 'red' },
                    { key: 'F9', label: 'Print & Save', icon: '🖨️', color: 'green' },
                    { key: 'Enter', label: 'Add Product', icon: '➕', color: 'purple' },
                  ].map(({ key, label, icon, color }) => (
                    <div key={key} className={`flex items-center gap-2 text-xs bg-${color}-50 p-2.5 rounded-lg border border-${color}-100`}>
                      <kbd className={`px-2 py-1 bg-white rounded border-2 border-${color}-300 font-mono font-bold text-${color}-700 shadow-sm`}>
                        {key}
                      </kbd>
                      <span className="flex items-center gap-1 text-gray-700">
                        <span>{icon}</span>
                        <span className="font-medium">{label}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CashBilling;