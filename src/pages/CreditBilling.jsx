import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import CustomerService from '../services/customer.service';
import CreditBillService from '../services/creditBill.service';
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

// 🎨 Product Confirmation Modal - FULL KEYBOARD NAVIGATION
const ProductConfirmationModal = ({ product, isOpen, onClose, onConfirm, formatLKR }) => {
  const [quantity, setQuantity] = useState(1);
  const [discountMode, setDiscountMode] = useState('default');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountLKR, setDiscountLKR] = useState(0);
  const [focusedField, setFocusedField] = useState('quantity');
  
  const modalRef = useRef(null);
  const qtyInputRef = useRef(null);
  const discountInputRef = useRef(null);

  const unitPrice = product?.selling_price || 0;
  const maxStock = product?.stock_quantity || 0;
  const autoDiscount = product?.discount_type === 'percent'
    ? unitPrice * (product.discount_value || 0) / 100
    : product?.discount_value || 0;

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setDiscountMode('default');
      setDiscountValue(product?.discount_value || 0);
      setDiscountLKR(autoDiscount);
      setFocusedField('quantity');
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, product, autoDiscount]);

  useEffect(() => {
    if (discountMode === 'default') {
      setDiscountLKR(autoDiscount);
      setDiscountValue(product?.discount_value || 0);
    } else if (discountMode === 'percent') {
      const val = Math.min(100, Math.max(0, discountValue));
      setDiscountLKR(unitPrice * val / 100);
    } else if (discountMode === 'fixed') {
      const val = Math.min(unitPrice, Math.max(0, discountValue));
      setDiscountLKR(val);
    }
  }, [discountMode, discountValue, unitPrice, autoDiscount, product]);

  const handleQuantityChange = (val) => {
    const qty = parseInt(val) || 1;
    setQuantity(Math.min(Math.max(1, qty), maxStock));
  };

  const handleDiscountValueChange = (val) => {
    const num = parseFloat(val) || 0;
    if (discountMode === 'percent') {
      setDiscountValue(Math.min(100, Math.max(0, num)));
    } else {
      setDiscountValue(Math.min(unitPrice, Math.max(0, num)));
    }
  };

  const handleConfirm = () => {
    if (quantity > maxStock) {
      toast.error(`⚠️ Max stock: ${maxStock}`);
      return;
    }
    onConfirm({
      quantity,
      discountMode,
      discountValue: discountMode === 'default' ? (product?.discount_value || 0) : discountValue,
      discountType: discountMode === 'default' ? (product?.discount_type || 'fixed') : discountMode,
      discountLKR: discountMode === 'default' ? autoDiscount : discountLKR
    });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (focusedField === 'quantity') {
      if (e.key === 'ArrowUp') { e.preventDefault(); handleQuantityChange(quantity + 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handleQuantityChange(quantity - 1); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setFocusedField('discountMode'); }
    }
    if (focusedField === 'discountMode') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const modes = ['default', 'percent', 'fixed'];
        const idx = modes.indexOf(discountMode);
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setDiscountMode(modes[(idx + dir + modes.length) % modes.length]);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (discountMode === 'default') handleConfirm();
        else { setFocusedField('discountValue'); setTimeout(() => discountInputRef.current?.focus(), 10); }
      } else if (e.key === 'Escape') { e.preventDefault(); setFocusedField('quantity'); qtyInputRef.current?.focus(); }
    }
    if (focusedField === 'discountValue' && discountMode !== 'default') {
      if (e.key === 'ArrowUp') { e.preventDefault(); handleDiscountValueChange(discountValue + (discountMode === 'percent' ? 1 : 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); handleDiscountValueChange(discountValue - (discountMode === 'percent' ? 1 : 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); setFocusedField('discountMode'); }
    }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  useEffect(() => {
    if (focusedField === 'quantity') { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }
    else if (focusedField === 'discountValue' && discountMode !== 'default') { discountInputRef.current?.focus(); discountInputRef.current?.select(); }
  }, [focusedField, discountMode]);

  if (!isOpen || !product) return null;
  const itemTotal = unitPrice * quantity;
  const totalDiscount = discountLKR * quantity;
  const finalTotal = itemTotal - totalDiscount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 outline-none" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-xl">🛍️</div>
            <div>
              <h3 className="text-lg font-bold text-white">Add to Cart</h3>
              <p className="text-xs text-white/80">⌨️ ↑↓ adjust • Enter confirm</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white" aria-label="Close">✕</button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold text-2xl">{(product?.item_name || '?').charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-lg truncate">{product?.item_name || 'N/A'}</h4>
              <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">{product?.barcode || 'No barcode'}</p>
              {product?.short_form && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 mt-2">{product.short_form}</span>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-purple-700">{formatLKR(unitPrice)}</p>
              <p className={`text-xs font-medium ${maxStock <= 10 ? 'text-red-600' : 'text-green-600'}`}>Stock: {maxStock}</p>
            </div>
          </div>
          {autoDiscount > 0 && discountMode === 'default' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-600">✓</span>
              <span className="text-sm font-medium text-green-700">Auto Discount: {formatLKR(autoDiscount)} ({product?.discount_value}{product?.discount_type === 'percent' ? '%' : ''})</span>
            </div>
          )}
          <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'quantity' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">Quantity {focusedField === 'quantity' && <span className="text-xs text-purple-600 font-normal">← ↑↓ adjust</span>}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => handleQuantityChange(quantity - 1)} className="w-10 h-10 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 flex items-center justify-center text-xl font-bold text-gray-700 disabled:opacity-50" disabled={quantity <= 1}>−</button>
              <input ref={qtyInputRef} type="number" min="1" max={maxStock} value={quantity} onChange={(e) => handleQuantityChange(e.target.value)} onFocus={() => setFocusedField('quantity')} className="flex-1 text-center text-xl font-bold border-2 border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" aria-label="Quantity" />
              <button type="button" onClick={() => handleQuantityChange(quantity + 1)} className="w-10 h-10 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 flex items-center justify-center text-xl font-bold text-gray-700 disabled:opacity-50" disabled={quantity >= maxStock}>+</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Max: {maxStock} • Enter →</p>
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'discountMode' || focusedField === 'discountValue' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">Discount {(focusedField === 'discountMode' || focusedField === 'discountValue') && <span className="text-xs text-purple-600 font-normal">← Active</span>}</label>
            <div className="space-y-3">
              <select value={discountMode} onChange={(e) => { setDiscountMode(e.target.value); if (e.target.value === 'default') handleConfirm(); else setFocusedField('discountValue'); }} onFocus={() => setFocusedField('discountMode')} className={`w-full border-2 rounded-xl py-2.5 px-4 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium outline-none ${focusedField === 'discountMode' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'}`} aria-label="Discount mode">
                <option value="default">🤖 Auto ({product?.discount_value}{product?.discount_type === 'percent' ? '%' : ''})</option>
                <option value="percent">📊 Manual %</option>
                <option value="fixed">💵 Manual LKR</option>
              </select>
              {discountMode !== 'default' && (
                <div className="relative">
                  <input ref={discountInputRef} type="number" min="0" step={discountMode === 'percent' ? "1" : "0.01"} max={discountMode === 'percent' ? "100" : unitPrice} value={discountValue} onChange={(e) => handleDiscountValueChange(e.target.value)} onFocus={() => setFocusedField('discountValue')} className={`w-full text-right border-2 rounded-xl py-2.5 px-4 pr-12 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${focusedField === 'discountValue' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'}`} placeholder={discountMode === 'percent' ? 'Enter %' : 'Enter LKR'} aria-label="Discount value" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{discountMode === 'percent' ? '%' : 'LKR'}</span>
                </div>
              )}
              {discountLKR > 0 && <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"><span className="text-sm font-medium text-green-700">Discount/item:</span><span className="font-bold text-green-700">{formatLKR(discountLKR)}</span></div>}
            </div>
            <p className="text-xs text-gray-500 mt-2">{discountMode === 'default' ? '✓ Auto applied • Enter to add' : '↑↓ adjust • Enter confirm'}</p>
          </div>
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal ({quantity} × {formatLKR(unitPrice)})</span><span className="font-medium">{formatLKR(itemTotal)}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount ({quantity} × {formatLKR(discountLKR)})</span><span className="font-medium">− {formatLKR(totalDiscount)}</span></div>}
            <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="text-lg font-bold text-gray-900">Total</span><span className="text-2xl font-black text-purple-700">{formatLKR(finalTotal)}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 px-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-xl hover:bg-gray-100">Cancel (ESC)</button>
          <button type="button" onClick={handleConfirm} disabled={quantity > maxStock} className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">✓ Add (Enter)</button>
        </div>
      </div>
    </div>
  );
};

const CreditBilling = () => {
  const { user } = useAuth();
  
  const [customerType, setCustomerType] = useState('existing');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchIndex, setCustomerSearchIndex] = useState(-1);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  
  const [newCustomer, setNewCustomer] = useState({
    customer_type: 'individual', name: '', company_name: '', mobile: '', email: '', address: '', city: '', nic_id: ''
  });
  
  // ✅ FIX 1: New customer form collapse state
  const [newCustomerFormCollapsed, setNewCustomerFormCollapsed] = useState(false);
  
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [highlightRow, setHighlightRow] = useState(null);
  const [barcodeScannerMode, setBarcodeScannerMode] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // ✅ NEW: Modal & keyboard states
  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState(-1);
  const [newCustomerFocusedField, setNewCustomerFocusedField] = useState('customerType');
  
  const searchInputRef = useRef(null);
  const customerSearchRef = useRef(null);
  const cartContainerRef = useRef(null);
  const suggestionRefs = useRef([]);
  const customerSuggestionRefs = useRef([]);
  const cartItemRefs = useRef([]);
  const newCustomerRefs = useRef({});

  // 🎯 Auto-focus on mount
  useEffect(() => {
    fetchCustomers();
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().slice(0, 10));
    setTimeout(() => {
      if (customerType === 'existing') customerSearchRef.current?.focus();
      else searchInputRef.current?.focus();
    }, 100);
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await CustomerService.getAll();
      if (response?.success && Array.isArray(response.data)) setCustomers(response.data);
      else setCustomers([]);
    } catch (error) { console.error('Fetch customers error:', error); setCustomers([]); }
  };

  // 🔍 Customer search with exact match priority
  useEffect(() => {
    if (searchCustomer.length < 1 || customerType !== 'existing') { setShowCustomerDropdown(false); setFilteredCustomers([]); return; }
    const timer = setTimeout(async () => {
      try {
        const response = await CustomerService.search(searchCustomer);
        if (response?.success && Array.isArray(response.data)) {
          const sorted = response.data.sort((a, b) => {
            const s = searchCustomer.toLowerCase();
            const score = (str) => str?.toLowerCase() === s ? 3 : str?.toLowerCase()?.startsWith(s) ? 2 : str?.toLowerCase()?.includes(s) ? 1 : 0;
            return Math.max(score(b.name), score(b.mobile), score(b.company_name)) - Math.max(score(a.name), score(a.mobile), score(a.company_name));
          });
          setFilteredCustomers(sorted);
          setShowCustomerDropdown(true);
          setCustomerSearchIndex(0);
        } else { setFilteredCustomers([]); setShowCustomerDropdown(false); }
      } catch (error) { console.error('Search error:', error); setFilteredCustomers([]); setShowCustomerDropdown(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCustomer, customerType]);

  // 🔍 Product search
  useEffect(() => {
    if (barcodeScannerMode) return;
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); setSelectedSuggestionIndex(-1); return; }
      try {
        const response = await ProductService.getAll({ search: searchQuery });
        if (response?.success && Array.isArray(response.data)) {
          const filtered = response.data.filter(p => p.stock_quantity > 0).slice(0, 8);
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
        } else { setSuggestions([]); setShowSuggestions(false); }
      } catch (error) { console.error('Search error:', error); setSuggestions([]); setShowSuggestions(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, barcodeScannerMode]);

  // 💰 Calculate totals
  const totals = useMemo(() => {
    let totalAmount = 0, totalDiscount = 0;
    if (!Array.isArray(cart)) return { totalAmount: 0, totalDiscount: 0, grandTotal: 0, itemCount: 0 };
    cart.forEach(item => { totalAmount += (item.unit_price || 0) * (item.quantity || 0); totalDiscount += (item.discount_lkr || 0) * (item.quantity || 0); });
    return { totalAmount, totalDiscount, grandTotal: Math.max(0, totalAmount - totalDiscount), itemCount: cart.reduce((s, i) => s + (i.quantity || 0), 0) };
  }, [cart]);
  const { totalAmount, totalDiscount, grandTotal, itemCount } = totals;

  // 🎯 GLOBAL KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e) => {
      // === SHORTCUTS: Ctrl+Alt+E/N for customer type ===
      if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
        if (e.key.toLowerCase() === 'e') { e.preventDefault(); setCustomerType('existing'); setNewCustomerFocusedField('search'); setTimeout(() => customerSearchRef.current?.focus(), 10); toast.success('👤 Existing (Ctrl+Alt+E)'); return; }
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); setCustomerType('new'); setNewCustomerFocusedField('customerType'); toast.success('🆕 New form (Ctrl+Alt+N)'); return; }
      }
      
      // === PAYMENT/CART SHORTCUTS (if not in modal) ===
      if (!showProductModal && !showSuggestions) {
        if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
        else if (e.key === 'F4') { e.preventDefault(); clearCart(); }
        else if (e.key === 'F9') { e.preventDefault(); handleCreateBill(); }
      }
      
      // === CUSTOMER DROPDOWN NAVIGATION ===
      if (showCustomerDropdown && filteredCustomers.length > 0 && customerType === 'existing') {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCustomerSearchIndex(i => Math.min(i + 1, filteredCustomers.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCustomerSearchIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && customerSearchIndex >= 0) {
          e.preventDefault();
          const cust = filteredCustomers[customerSearchIndex];
          if (cust?.id) { 
            setSelectedCustomer(cust); 
            setShowCustomerDropdown(false); 
            setSearchCustomer(`${cust.name}${cust.company_name ? ` - ${cust.company_name}` : ''}`); 
            toast.success(`✓ ${cust.name}`);
            // ✅ FIX 2: Focus product search after customer selection
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
        }
      }
      
      // === PRODUCT SUGGESTIONS NAVIGATION ===
      if (showSuggestions && suggestions.length > 0 && !showProductModal) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestionIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) { e.preventDefault(); handleProductSelect(suggestions[selectedSuggestionIndex]); }
      }
      
      // === CART NAVIGATION ===
      if (Array.isArray(cart) && cart.length > 0 && !showProductModal && !showSuggestions) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCartItemIndex(i => { const n = i < cart.length - 1 ? i + 1 : i; cartItemRefs.current[n]?.scrollIntoView({ block: 'nearest' }); return n; }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCartItemIndex(i => { const n = i > 0 ? i - 1 : i; cartItemRefs.current[n]?.scrollIntoView({ block: 'nearest' }); return n; }); }
        else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCartItemIndex >= 0) {
          e.preventDefault();
          const item = cart[selectedCartItemIndex];
          if (item?.product_id && window.confirm(`🗑️ Remove "${item.product_name}"?`)) { removeFromCart(item.product_id); setSelectedCartItemIndex(i => Math.max(0, i - 1)); toast.success('✓ Removed'); }
        }
      }
      
      // === NEW CUSTOMER FORM NAVIGATION ===
      if (customerType === 'new' && !showProductModal && !newCustomerFormCollapsed) {
        const fields = ['customerType', 'name', 'mobile', 'email', 'address', 'city', 'nic_id'];
        const idx = fields.indexOf(newCustomerFocusedField);
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (idx < fields.length - 1) {
            const next = fields[idx + 1];
            setNewCustomerFocusedField(next);
            setTimeout(() => newCustomerRefs.current[next]?.focus(), 10);
          } else {
            // ✅ FIX 1: After NIC, collapse form and focus product search
            setNewCustomerFormCollapsed(true);
            setNewCustomerFocusedField('done');
            searchInputRef.current?.focus();
            toast.success('✅ Customer saved • Start adding products');
          }
        }
        if (newCustomerFocusedField === 'customerType' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const types = ['individual', 'company'];
          const cur = types.indexOf(newCustomer.customer_type);
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          setNewCustomer({ ...newCustomer, customer_type: types[(cur + dir + types.length) % types.length] });
        }
      }
      
      // === ESC TO CLOSE ===
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false); setShowCustomerDropdown(false); setShowProductModal(false);
        setSelectedSuggestionIndex(-1); setCustomerSearchIndex(-1); setSelectedCartItemIndex(-1);
        setPendingProduct(null);
        if (!barcodeScannerMode) setSearchQuery('');
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCustomerDropdown, showSuggestions, suggestions, filteredCustomers, selectedSuggestionIndex, customerSearchIndex, barcodeScannerMode, cart, customerType, newCustomerFocusedField, showProductModal, selectedCartItemIndex, newCustomerFormCollapsed]);

  // 🛒 Handle product selection → show modal
  const handleProductSelect = useCallback((product) => {
    if (!product?.id || (product.stock_quantity || 0) <= 0) { if (product?.item_name) toast.error(`❌ Out of stock: ${product.item_name}`); return; }
    setPendingProduct(product); setShowProductModal(true); setShowSuggestions(false); setSelectedSuggestionIndex(-1); setSearchQuery('');
    if (!barcodeScannerMode) searchInputRef.current?.focus();
  }, [barcodeScannerMode]);

  // ✅ Confirm add from modal
  const confirmAddToCart = useCallback((data) => {
    if (!pendingProduct?.id) return;
    const { quantity, discountMode, discountValue, discountType, discountLKR } = data;
    setCart(prev => {
      const safe = Array.isArray(prev) ? prev : [];
      const ex = safe.find(i => i.product_id === pendingProduct.id);
      if (ex) {
        const nq = (ex.quantity || 0) + quantity;
        if (nq > (pendingProduct.stock_quantity || 0)) { toast.error(`⚠️ Max: ${pendingProduct.stock_quantity}`); return prev; }
        return safe.map(i => i.product_id === pendingProduct.id ? { ...i, quantity: nq } : i);
      }
      const autoDisc = discountMode === 'default' ? (pendingProduct.discount_type === 'percent' ? (pendingProduct.selling_price || 0) * (pendingProduct.discount_value || 0) / 100 : (pendingProduct.discount_value || 0)) : 0;
      return [...safe, { product_id: pendingProduct.id, product_name: pendingProduct.item_name || '', barcode: pendingProduct.barcode || '', short_form: pendingProduct.short_form || '', unit_price: pendingProduct.selling_price || 0, quantity, max_stock: pendingProduct.stock_quantity || 0, discount_mode: discountMode, discount_value: discountMode === 'default' ? (pendingProduct.discount_value || 0) : discountValue, discount_type: discountMode === 'default' ? (pendingProduct.discount_type || 'fixed') : discountType, auto_discount_lkr: autoDisc, discount_lkr: discountLKR }];
    });
    playScanSound(); setHighlightRow(pendingProduct.id); setTimeout(() => setHighlightRow(null), 800);
    toast.success(`✓ Added: ${pendingProduct.item_name} × ${quantity}`);
    setPendingProduct(null); setShowProductModal(false);
    if (!barcodeScannerMode) searchInputRef.current?.focus();
  }, [pendingProduct, barcodeScannerMode]);

  // 📦 Search submit
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (barcodeScannerMode) {
      try {
        const res = await ProductService.getAll({ search: searchQuery.trim() });
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const exact = res.data.find(p => p.barcode === searchQuery.trim());
          if (exact) { handleProductSelect(exact); setSearchQuery(''); return; }
        }
        toast.error('❌ Not found'); setSearchQuery('');
      } catch (err) { console.error('Barcode error:', err); setSearchQuery(''); }
      return;
    }
    try {
      const res = await ProductService.getAll({ search: searchQuery.trim() });
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const exact = res.data.find(p => p.barcode === searchQuery.trim());
        if (exact) { handleProductSelect(exact); return; }
      }
    } catch (err) { console.error('Lookup error:', err); }
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      const idx = selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length ? selectedSuggestionIndex : 0;
      if (suggestions[idx]) handleProductSelect(suggestions[idx]);
    }
  };

  const handleSearchChange = (e) => {
    if (barcodeScannerMode) { const v = e.target.value; setSearchQuery(v); if (v.endsWith('\n')) { setSearchQuery(v.replace(/\n$/, '')); handleSearchSubmit(e); } }
    else setSearchQuery(e.target.value);
  };

  // 🔄 Update cart
  const updateCartItem = (productId, field, value) => {
    setCart(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(item => {
        if (item.product_id !== productId) return item;
        let upd = { ...item };
        if (field === 'quantity') {
          const q = parseInt(value) || 0;
          if (q <= 0) { toast.error('⚠️ Min: 1'); return item; }
          if (q > (item.max_stock || 0)) { toast.error(`⚠️ Max: ${item.max_stock}`); return item; }
          upd.quantity = q;
        } else if (field === 'discount_mode') {
          upd.discount_mode = value;
          if (value === 'default') { upd.discount_lkr = item.auto_discount_lkr || 0; upd.discount_value = item.discount_value || 0; upd.discount_type = item.discount_type || 'fixed'; }
          else if (value === 'percent') { upd.discount_value = 0; upd.discount_lkr = 0; upd.discount_type = 'percent'; }
          else if (value === 'fixed') { upd.discount_value = 0; upd.discount_lkr = 0; upd.discount_type = 'fixed'; }
        } else if (field === 'discount_value') {
          const v = parseFloat(value) || 0;
          if (v < 0) { toast.error('⚠️ No negative'); return item; }
          upd.discount_value = v;
          if (upd.discount_mode === 'percent') { if (v > 100) { toast.error('⚠️ Max 100%'); upd.discount_value = 100; upd.discount_lkr = item.unit_price || 0; } else upd.discount_lkr = (item.unit_price || 0) * v / 100; }
          else if (upd.discount_mode === 'fixed') { if (v > (item.unit_price || 0)) { toast.error('⚠️ Max: price'); upd.discount_value = item.unit_price || 0; upd.discount_lkr = item.unit_price || 0; } else upd.discount_lkr = v; }
        }
        return upd;
      });
    });
  };

  const removeFromCart = (productId) => setCart(prev => Array.isArray(prev) ? prev.filter(i => i.product_id !== productId) : []);
  const clearCart = () => { if (!Array.isArray(cart) || cart.length === 0) return; if (window.confirm('🗑️ Clear cart?')) { setCart([]); setSelectedCartItemIndex(-1); toast.success('Cart cleared'); } };

  // 🧾 Create bill
  const handleCreateBill = async () => {
    let customer = selectedCustomer;
    if (customerType === 'new') {
      const { name, mobile, address, city } = newCustomer;
      if (!name?.trim() || !mobile?.trim() || !address?.trim() || !city?.trim()) { toast.error('❌ Fill: Name, Mobile, Address, City'); return; }
      if (!/^07[01245678]\d{7}$/.test(mobile)) { toast.error('❌ Valid mobile: 07X XXX XXXX'); return; }
      try {
        const res = await CustomerService.create({ customer_type: newCustomer.customer_type || 'individual', name: name.trim(), company_name: newCustomer.company_name?.trim() || null, mobile: mobile.trim(), email: newCustomer.email?.trim() || null, address: address.trim(), city: city.trim(), nic_id: newCustomer.nic_id?.trim() || null });
        if (!res?.success || !res.data) { toast.error(res?.error || '❌ Create failed'); return; }
        customer = res.data; setSelectedCustomer(customer); toast.success('✅ Customer created'); fetchCustomers();
        // ✅ FIX 1: Collapse form after successful creation
        setNewCustomerFormCollapsed(true);
      } catch (err) { console.error('Create error:', err); toast.error('❌ Network error'); return; }
    } else { if (!selectedCustomer?.id) { toast.error('❌ Select customer'); return; } }
    
    if (!Array.isArray(cart) || cart.length === 0 || grandTotal <= 0 || !dueDate) { toast.error('❌ Validate cart & due date'); return; }
    
    setProcessing(true);
    try {
      const items = cart.map(i => ({ product_id: i.product_id, product_name: i.product_name, barcode: i.barcode, unit_price: parseFloat(i.unit_price) || 0, quantity: parseInt(i.quantity) || 1, discount_lkr: parseFloat(i.discount_lkr) || 0 }));
      const res = await CreditBillService.create({ customer_id: customer.id, customer_name: customer.name, customer_mobile: customer.mobile, items, due_date: dueDate, notes: notes?.trim() || null });
      if (res?.success && res.data) {
        toast.success(`✅ Credit Bill #${res.data.billNumber}`);
        openReceiptPrint(res.data, cart, customer);
        setCart([]); setSelectedCustomer(null); setCustomerType('existing'); setSearchQuery(''); setSearchCustomer(''); setNotes('');
        const dd = new Date(); dd.setDate(dd.getDate() + 30); setDueDate(dd.toISOString().slice(0, 10));
        searchInputRef.current?.focus();
      } else toast.error(res?.error || '❌ Failed');
    } catch (err) { console.error('Bill error:', err); toast.error(err.message || '❌ Billing failed'); }
    finally { setProcessing(false); }
  };

  // 🖨️ Receipt print
  const openReceiptPrint = (bill, items, cust) => {
    const w = window.open('', '_blank', 'width=400,height=700');
    const out = cust?.outstanding_balance || 0;
    w.document.write(`<!DOCTYPE html><html><head><title>Credit Bill - ${bill.billNumber}</title><style>@page{size:80mm auto;margin:0}body{font-family:'Courier New',monospace;font-size:10px;padding:8px;margin:0;background:#fff;color:#000}.header{text-align:center;margin-bottom:8px;border-bottom:2px dashed #000;padding-bottom:8px}.header h2{margin:0;font-size:16px;font-weight:bold}.header p{margin:2px 0;font-size:9px}.customer-info{margin-bottom:8px;font-size:9px;border-bottom:1px solid #ccc;padding-bottom:6px}.customer-info div{margin:2px 0}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{text-align:left;border-bottom:1px solid #000;padding:3px 0;font-size:9px;font-weight:bold}td{padding:3px 0;font-size:9px}.totals{border-top:2px dashed #000;padding-top:6px;margin-top:6px}.totals div{display:flex;justify-content:space-between;margin:3px 0;font-size:10px}.grand-total{font-weight:bold;font-size:13px;border-top:1px solid #000;padding-top:4px;margin-top:4px}.outstanding{background:#7c3aed;color:#fff;padding:6px;margin-top:6px;text-align:center;font-weight:bold;font-size:12px}.footer{text-align:center;margin-top:12px;font-size:8px;border-top:1px dashed #000;padding-top:6px}.credit-badge{background:#7c3aed;color:#fff;padding:2px 8px;font-weight:bold;font-size:9px;border-radius:3px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><h2>SAMAGI HARDWARE</h2><p>POS System - <span class="credit-badge">CREDIT BILL</span></p><p>${new Date().toLocaleString('en-LK')}</p></div><div class="customer-info"><div><strong>Bill #:</strong> ${bill.billNumber}</div><div><strong>Customer:</strong> ${cust?.name || 'N/A'}${cust?.company_name ? ` (${cust.company_name})` : ''}</div><div><strong>Mobile:</strong> ${cust?.mobile || 'N/A'}</div><div><strong>Address:</strong> ${cust?.address || 'N/A'}${cust?.city ? `, ${cust.city}` : ''}</div><div><strong>Due Date:</strong> ${bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-LK') : 'N/A'}</div>${out > 0 ? `<div><strong>Previous Outstanding:</strong> LKR ${out.toFixed(2)}</div>` : ''}</div><table><thead><tr><th style="width:40%">Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Disc</th><th style="text-align:right">Total</th></tr></thead><tbody>${Array.isArray(items) ? items.map(it => `<tr><td>${it.product_name || 'N/A'}<br><span style="font-size:8px;color:#666">${it.barcode || ''}</span></td><td style="text-align:center">${it.quantity || 1}</td><td style="text-align:right">${(it.unit_price || 0).toFixed(2)}</td><td style="text-align:right;color:red">${(it.discount_lkr || 0) > 0 ? '-' + ((it.discount_lkr * it.quantity) || 0).toFixed(2) : '-'}</td><td style="text-align:right;font-weight:bold">${(((it.unit_price || 0) * (it.quantity || 1)) - ((it.discount_lkr || 0) * (it.quantity || 1))).toFixed(2)}</td></tr>`).join('') : ''}</tbody></table><div class="totals"><div><span>Subtotal:</span><span>LKR ${totalAmount.toFixed(2)}</span></div><div style="color:red"><span>Discount:</span><span>- LKR ${totalDiscount.toFixed(2)}</span></div><div class="grand-total"><span>TOTAL:</span><span>LKR ${grandTotal.toFixed(2)}</span></div></div><div class="outstanding">NEW OUTSTANDING: LKR ${(grandTotal + out).toFixed(2)}</div><div class="footer"><p>Thank you for your business!</p><p>Please settle by due date</p><p>Cashier: ${bill.cashier || 'N/A'}</p></div><script>window.onload=()=>{setTimeout(()=>window.print(),300)};<\/script></body></html>`);
    w.document.close();
  };

  const formatLKR = (amt) => `LKR ${(amt || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      {/* ✅ Product Modal */}
      <ProductConfirmationModal product={pendingProduct} isOpen={showProductModal} onClose={() => { setShowProductModal(false); setPendingProduct(null); searchInputRef.current?.focus(); }} onConfirm={confirmAddToCart} formatLKR={formatLKR} />
      
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl shadow-lg">💳</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Credit Billing</h1>
                <p className="text-sm text-gray-500">⌨️ Ctrl+Alt+E/N • ↑↓ navigate • Enter confirm</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">{user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}</div>
                <div className="text-sm"><p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p><p className="text-xs text-gray-500 capitalize">{user?.role}</p></div>
              </div>
              <div className="px-4 py-2 bg-purple-100 border border-purple-200 rounded-xl"><span className="text-sm font-bold text-purple-700">CREDIT ONLY</span></div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* Customer Panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><span className="text-2xl">👤</span> Customer <span className="text-xs text-gray-500 font-normal ml-2">Ctrl+Alt+E=Existing • Ctrl+Alt+N=New</span></h3>
                {/* ✅ FIX 1: Toggle button for new customer form */}
                {customerType === 'new' && selectedCustomer && newCustomerFormCollapsed && (
                  <button 
                    onClick={() => setNewCustomerFormCollapsed(false)}
                    className="text-xs px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-all flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Customer
                  </button>
                )}
              </div>
              
              <div className="flex gap-4 mb-6">
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${customerType === 'existing' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" value="existing" checked={customerType === 'existing'} onChange={(e) => { setCustomerType(e.target.value); setSelectedCustomer(null); setSearchCustomer(''); setNewCustomerFocusedField('search'); setNewCustomerFormCollapsed(false); }} className="sr-only" />
                  <div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${customerType === 'existing' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>{customerType === 'existing' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}</div><div><p className="font-bold text-gray-900">Existing</p><p className="text-xs text-gray-500"><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt+E</kbd></p></div></div>
                </label>
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${customerType === 'new' ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" value="new" checked={customerType === 'new'} onChange={(e) => { setCustomerType(e.target.value); setSelectedCustomer(null); setNewCustomerFocusedField('customerType'); setNewCustomerFormCollapsed(false); }} className="sr-only" />
                  <div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${customerType === 'new' ? 'border-green-500 bg-green-500' : 'border-gray-400'}`}>{customerType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}</div><div><p className="font-bold text-gray-900">New</p><p className="text-xs text-gray-500"><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt+N</kbd></p></div></div>
                </label>
              </div>
              
              {customerType === 'existing' && (
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Search Customer <span className="text-red-500">*</span> {newCustomerFocusedField === 'search' && <span className="text-xs text-blue-600 font-normal">← Type • ↓ select • Enter confirm</span>}</label>
                  <div className="relative">
                    <input ref={customerSearchRef} type="text" value={searchCustomer} onChange={(e) => { setSearchCustomer(e.target.value); setShowCustomerDropdown(true); }} onFocus={() => { setNewCustomerFocusedField('search'); if (searchCustomer.length >= 1) setShowCustomerDropdown(true); }} placeholder="Type name, mobile, or company..." className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${newCustomerFocusedField === 'search' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`} aria-label="Search customer" />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      {filteredCustomers.map((c, i) => (<button key={c?.id || i} ref={el => customerSuggestionRefs.current[i] = el} onClick={() => { if (c?.id) { setSelectedCustomer(c); setShowCustomerDropdown(false); setSearchCustomer(`${c.name}${c.company_name ? ` - ${c.company_name}` : ''}`); toast.success(`✓ ${c.name}`); setTimeout(() => searchInputRef.current?.focus(), 50); }}} className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 transition-all ${i === customerSearchIndex ? 'bg-blue-100 border-l-4 border-l-blue-600' : 'hover:bg-blue-50'}`} onMouseEnter={() => setCustomerSearchIndex(i)}><div className="flex justify-between items-start"><div><p className={`font-bold ${i === customerSearchIndex ? 'text-blue-700' : 'text-gray-900'}`}>{c?.name || 'N/A'}{i === 0 && searchCustomer.length > 2 && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Exact</span>}</p>{c?.company_name && <p className="text-xs text-gray-600 mt-0.5">{c.company_name}</p>}<p className="text-xs text-gray-500 mt-1">📞 {c?.mobile || 'N/A'} • 📍 {c?.city || 'N/A'}</p></div>{(c?.outstanding_balance || 0) > 0 && <div className="text-right"><p className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Outstanding</p><p className="text-sm font-bold text-red-700 mt-1">LKR {(c.outstanding_balance || 0).toFixed(2)}</p></div>}</div></button>))}
                    </div>
                  )}
                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex justify-between items-start"><div><p className="font-bold text-blue-900 text-lg">{selectedCustomer?.name || 'N/A'}</p>{selectedCustomer?.company_name && <p className="text-sm text-blue-700 font-medium">{selectedCustomer.company_name}</p>}<p className="text-sm text-blue-600 mt-1">📞 {selectedCustomer?.mobile || 'N/A'}</p><p className="text-sm text-gray-600">📍 {selectedCustomer?.address || 'N/A'}, {selectedCustomer?.city || 'N/A'}</p></div>{(selectedCustomer?.outstanding_balance || 0) > 0 && <div className="text-right"><p className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">⚠️ Outstanding</p><p className="text-xl font-black text-red-700 mt-2">LKR {(selectedCustomer.outstanding_balance || 0).toFixed(2)}</p></div>}</div>
                    </div>
                  )}
                </div>
              )}
              
              {customerType === 'new' && (
                <>
                  {/* ✅ FIX 1: Collapsible new customer form */}
                  {!newCustomerFormCollapsed ? (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className={`col-span-2 p-4 rounded-xl border-2 transition-all ${newCustomerFocusedField === 'customerType' ? 'border-green-500 bg-green-50/30 ring-2 ring-green-200' : 'border-gray-200 bg-gray-50'}`}>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">Customer Type {newCustomerFocusedField === 'customerType' && <span className="text-xs text-green-600 font-normal">← ↑↓ change • Enter next</span>}</label>
                        <select ref={el => newCustomerRefs.current['customerType'] = el} value={newCustomer.customer_type} onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value})} onFocus={() => setNewCustomerFocusedField('customerType')} className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${newCustomerFocusedField === 'customerType' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`} aria-label="Customer type"><option value="individual">👤 Individual</option><option value="company">🏢 Company</option></select>
                      </div>
                      {['name', 'mobile', 'email', 'address', 'city', 'nic_id'].map((field) => {
                        const isReq = ['name', 'mobile', 'address', 'city'].includes(field);
                        const isArea = field === 'address';
                        return (
                          <div key={field} className={`${field === 'address' ? 'col-span-2' : ''} p-4 rounded-xl border-2 transition-all ${newCustomerFocusedField === field ? 'border-green-500 bg-green-50/30 ring-2 ring-green-200' : 'border-gray-200 bg-gray-50'}`}>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2 capitalize">{field.replace('_', ' ')} {isReq && <span className="text-red-500">*</span>} {newCustomerFocusedField === field && <span className="text-xs text-green-600 font-normal">← Active • Enter next</span>}</label>
                            {isArea ? (
                              <textarea ref={el => newCustomerRefs.current[field] = el} value={newCustomer[field]} onChange={(e) => setNewCustomer({...newCustomer, [field]: e.target.value})} onFocus={() => setNewCustomerFocusedField(field)} className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${newCustomerFocusedField === field ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`} rows={2} placeholder={`Enter ${field}`} aria-label={field} />
                            ) : (
                              <input ref={el => newCustomerRefs.current[field] = el} type={field === 'mobile' ? 'tel' : field === 'email' ? 'email' : 'text'} value={newCustomer[field]} onChange={(e) => setNewCustomer({...newCustomer, [field]: e.target.value})} onFocus={() => setNewCustomerFocusedField(field)} className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${newCustomerFocusedField === field ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`} placeholder={`Enter ${field}${isReq ? '' : ' (optional)'}`} aria-label={field} />
                            )}
                            {field === 'mobile' && <p className="text-xs text-gray-400 mt-1">Format: 07X XXX XXXX</p>}
                            {field === 'city' && <p className="text-xs text-gray-400 mt-1">Press Enter to skip if optional</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // ✅ Collapsed state - shows summary with edit button
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl animate-in fade-in duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✓ Saved</span>
                            <p className="font-bold text-green-900">{newCustomer.name || 'New Customer'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                            <p>📞 {newCustomer.mobile}</p>
                            <p>🏙️ {newCustomer.city}</p>
                            {newCustomer.company_name && <p className="col-span-2">🏢 {newCustomer.company_name}</p>}
                            {newCustomer.email && <p className="col-span-2">✉️ {newCustomer.email}</p>}
                          </div>
                        </div>
                        <button 
                          onClick={() => setNewCustomerFormCollapsed(false)}
                          className="ml-4 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 relative">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative"><input type="checkbox" checked={barcodeScannerMode} onChange={(e) => { setBarcodeScannerMode(e.target.checked); setSearchQuery(''); setShowSuggestions(false); setSelectedSuggestionIndex(-1); if (e.target.checked) { searchInputRef.current?.focus(); toast.success('📷 Scanner Mode'); }}} className="sr-only peer" /><div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div></div>
                  <div className="flex flex-col"><span className="text-sm font-bold text-gray-700 group-hover:text-purple-700">📷 Barcode Scanner</span><span className="text-xs text-gray-500">{barcodeScannerMode ? 'Auto-add on scan' : 'Type to search'}</span></div>
                </label>
                {barcodeScannerMode && <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-xs font-bold text-green-700">Ready</span></div>}
              </div>
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input ref={searchInputRef} type="text" value={searchQuery} onChange={handleSearchChange} placeholder={barcodeScannerMode ? "🔍 Scan now..." : "🔍 Search name/barcode/short form..."} readOnly={barcodeScannerMode} className={`w-full pl-12 pr-24 py-4 text-lg bg-gray-50 border-2 rounded-xl focus:outline-none transition-all ${barcodeScannerMode ? 'border-green-300 bg-green-50/30 cursor-not-allowed' : 'border-gray-200 focus:border-purple-500 focus:bg-white'}`} autoComplete="off" />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">{barcodeScannerMode ? <svg className="w-6 h-6 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> : <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2"><kbd className="hidden sm:inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono font-bold text-gray-600">ESC</kbd></div>
                  </div>
                  {!barcodeScannerMode && <button type="submit" disabled={!searchQuery.trim()} className="px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md">Add</button>}
                </div>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">Enter</kbd> Select</span>
                <span className="flex items-center gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">ESC</kbd> Cancel</span>
                <span className="flex items-center gap-1"><kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">Ctrl+1/2/3</kbd> Payment</span>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                  {suggestions.map((p, i) => (<button key={p?.id || i} ref={el => suggestionRefs.current[i] = el} onClick={() => p && handleProductSelect(p)} className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 flex justify-between items-center transition-all group ${i === selectedSuggestionIndex ? 'bg-purple-100 border-l-4 border-l-purple-600' : 'hover:bg-purple-50'}`}><div className="flex-1"><div className="flex items-center gap-2"><p className={`font-bold ${i === selectedSuggestionIndex ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-700'}`}>{p.item_name || 'N/A'}</p>{(p.discount_value || 0) > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">-{p.discount_value}{p.discount_type === 'percent' ? '%' : ''}</span>}</div><p className="text-xs text-gray-500 mt-1"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{p.barcode || ''}</span>{p.short_form && <span className="ml-2">• {p.short_form}</span>}</p></div><div className="text-right ml-4"><p className="font-bold text-purple-700 text-lg">{formatLKR(p.selling_price)}</p><p className="text-xs text-gray-500">Stock: <span className={(p.stock_quantity || 0) <= 10 ? 'text-red-600 font-medium' : 'text-green-600'}>{p.stock_quantity || 0}</span></p></div></button>))}
                </div>
              )}
            </div>
            
            {/* Cart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold shadow-md">{itemCount}</div><h3 className="font-bold text-gray-900 text-lg">Cart Items</h3></div>
                <button onClick={clearCart} disabled={!Array.isArray(cart) || cart.length === 0} className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all font-bold disabled:opacity-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Clear (F4)</button>
              </div>
              <div className="flex-1 overflow-auto" ref={cartContainerRef}>
                {!Array.isArray(cart) || cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                    <div className="text-7xl mb-4 opacity-30">🛒</div>
                    <p className="text-lg font-bold text-gray-600">Cart is empty</p>
                    <p className="text-sm mt-2 text-gray-500">{barcodeScannerMode ? 'Scan to add' : 'Search or scan to add'}</p>
                    <p className="text-xs text-gray-400 mt-4">💡 Ctrl+1/2/3 for payment</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Product</th><th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase w-24">Qty</th><th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase w-32">Price</th><th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase w-40">Discount</th><th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase w-32">Subtotal</th><th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase w-20">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cart.map((item, idx) => (<tr key={item?.product_id || idx} ref={el => cartItemRefs.current[idx] = el} className={`transition-all duration-200 cursor-pointer ${selectedCartItemIndex === idx ? 'bg-purple-100 ring-2 ring-purple-500 shadow-md' : highlightRow === item?.product_id ? 'bg-purple-50 ring-2 ring-purple-500/30' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-purple-50/50`} onClick={() => setSelectedCartItemIndex(idx)} onMouseEnter={() => setSelectedCartItemIndex(idx)}><td className="px-6 py-4"><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold text-lg">{(item?.product_name || '?').charAt(0).toUpperCase()}</div><div><p className="font-bold text-gray-900">{item?.product_name || 'N/A'}</p><p className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 rounded">{item?.barcode || ''}</p>{item?.short_form && <div className="mt-1"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{item.short_form}</span></div>}{(item?.discount_lkr || 0) > 0 && <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">✓ Auto: {formatLKR(item.discount_lkr)}</div>}</div></div></td><td className="px-4 py-4 text-center"><div className="flex flex-col items-center gap-1"><input type="number" min="1" max={item?.max_stock || 999} value={item?.quantity || 1} onChange={(e) => updateCartItem(item?.product_id, 'quantity', e.target.value)} className="w-20 text-center border-2 border-gray-200 rounded-xl py-2 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" /><p className="text-[10px] text-gray-400">Max: {item?.max_stock || 0}</p></div></td><td className="px-4 py-4 text-right font-bold text-gray-900">{formatLKR(item?.unit_price)}</td><td className="px-4 py-4 text-right"><div className="flex flex-col items-end gap-2"><select value={item?.discount_mode || 'default'} onChange={(e) => updateCartItem(item?.product_id, 'discount_mode', e.target.value)} className="w-full text-xs border-2 border-gray-200 rounded-lg py-2 px-2 bg-white focus:ring-2 focus:ring-purple-500 font-medium"><option value="default">🤖 Auto</option><option value="percent">📊 %</option><option value="fixed">💵 LKR</option></select><div className="relative w-full"><input type="number" min="0" step={(item?.discount_mode === 'percent') ? "1" : "0.01"} max={(item?.discount_mode === 'percent') ? "100" : (item?.unit_price || 0)} value={item?.discount_value || 0} onChange={(e) => updateCartItem(item?.product_id, 'discount_value', e.target.value)} disabled={(item?.discount_mode || 'default') === 'default'} className={`w-full text-right border-2 rounded-lg py-2 font-medium pl-8 ${(item?.discount_mode || 'default') === 'default' ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-purple-500'}`} placeholder={(item?.discount_mode === 'percent') ? '0%' : '0.00'} /><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{(item?.discount_mode === 'percent') ? '%' : 'Rs'}</span></div>{(item?.discount_lkr || 0) > 0 && <p className="text-[10px] text-green-600 font-bold">Saved: {formatLKR((item.discount_lkr || 0) * (item.quantity || 1))}</p>}</div></td><td className="px-4 py-4 text-right font-black text-purple-700 text-xl">{formatLKR(((item?.unit_price || 0) * (item?.quantity || 1)) - ((item?.discount_lkr || 0) * (item?.quantity || 1)))}</td><td className="px-4 py-4 text-center"><button onClick={() => item?.product_id && removeFromCart(item.product_id)} className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all" title="Remove (Backspace)"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td></tr>))}
                    </tbody>
                  </table>
                )}
              </div>
              {cart.length > 0 && <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-4"><span>⌨️ <kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">↑↓</kbd> Navigate</span><span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">Backspace</kbd> Remove</span><span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">Ctrl+1/2/3</kbd> Payment</span></div>}
            </div>
          </div>
          
          {/* Right Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-lg">📊</div><div><h3 className="text-lg font-black text-gray-900">Bill Summary</h3><p className="text-xs text-gray-500">{itemCount} items</p></div></div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600 p-3 bg-gray-50 rounded-xl"><span className="text-sm font-bold">Subtotal</span><span className="font-bold text-lg">{formatLKR(totalAmount)}</span></div>
                <div className="flex justify-between items-center text-green-600 p-3 bg-green-50 rounded-xl border border-green-100"><span className="text-sm font-bold">Discount</span><span className="font-bold text-lg">- {formatLKR(totalDiscount)}</span></div>
                {totalDiscount > 0 && <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center shadow-lg"><p className="text-sm font-bold">🎉 Saved: <strong>{formatLKR(totalDiscount)}</strong></p></div>}
                <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center"><span className="text-lg font-bold text-gray-900">Grand Total</span><span className="text-4xl font-black text-purple-700">{formatLKR(grandTotal)}</span></div>
                {selectedCustomer && (selectedCustomer.outstanding_balance || 0) > 0 && <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 p-4 rounded-xl"><p className="text-xs font-bold text-red-800 mb-1">Current Outstanding</p><p className="text-2xl font-black text-red-700">LKR {(selectedCustomer.outstanding_balance || 0).toFixed(2)}</p><p className="text-xs text-red-600 mt-2 font-semibold">New Total: LKR {((selectedCustomer.outstanding_balance || 0) + grandTotal).toFixed(2)}</p></div>}
              </div>
              <div className="mb-4"><label className="block text-sm font-bold text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold" /></div>
              <div className="mb-6"><label className="block text-sm font-bold text-gray-700 mb-2">Notes (Optional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" rows={3} placeholder="Additional notes..." /></div>
              <button onClick={handleCreateBill} disabled={processing || !Array.isArray(cart) || cart.length === 0 || grandTotal <= 0 || !dueDate || (customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id))} className={`w-full py-4 font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 mb-4 ${processing || !Array.isArray(cart) || cart.length === 0 || grandTotal <= 0 || !dueDate || (customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id)) ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow-xl hover:scale-[1.02]'}`}>{processing ? <><svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Processing...</> : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Create Credit Bill (F9)</>}</button>
              <div className="space-y-2">{customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id) && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1 font-semibold"><span>⚠️</span><span>Select customer first</span></p>}{(!Array.isArray(cart) || cart.length === 0) && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1 font-semibold"><span>⚠️</span><span>Add items to cart</span></p>}</div>
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4 mb-4 mt-4"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 3.04A12.02 12.02 0 0112 5.5c0 3.037-1.15 5.776-3.04 7.618" /></svg></div><div><p className="text-sm font-bold text-gray-900">Credit Transaction</p><p className="text-xs text-gray-600 mt-1">Stock deducted. Outstanding updated. Pay by due date.</p></div></div></div>
              <div className="pt-4 border-t-2 border-gray-100"><p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Keyboard Shortcuts</p><div className="grid grid-cols-2 gap-2">{[{key:'F2',label:'Focus Search',icon:'🔍',color:'blue'},{key:'F4',label:'Clear Cart',icon:'🗑️',color:'red'},{key:'F9',label:'Create Bill',icon:'📄',color:'purple'},{key:'Enter',label:'Add/Next',icon:'➕',color:'green'},{key:'Ctrl+Alt+E/N',label:'Customer Type',icon:'👤',color:'amber'},{key:'↑↓',label:'Navigate',icon:'📋',color:'gray'},{key:'⌫',label:'Remove Item',icon:'🗑️',color:'red'}].map(({key,label,icon,color})=>(<div key={key} className={`flex items-center gap-2 text-xs bg-${color}-50 p-2.5 rounded-lg border border-${color}-100`}><kbd className={`px-2 py-1 bg-white rounded border-2 border-${color}-300 font-mono font-bold text-${color}-700 shadow-sm`}>{key}</kbd><span className="flex items-center gap-1 text-gray-700"><span>{icon}</span><span className="font-bold">{label}</span></span></div>))}</div></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreditBilling;