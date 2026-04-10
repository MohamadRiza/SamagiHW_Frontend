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

const CreditBilling = () => {
  const { user } = useAuth();
  
  // ✅ FIX: Initialize customers as empty array
  const [customerType, setCustomerType] = useState('existing');
  const [customers, setCustomers] = useState([]); // ✅ Initialized as []
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchIndex, setCustomerSearchIndex] = useState(-1);
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    customer_type: 'individual',
    name: '',
    company_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    nic_id: ''
  });
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [highlightRow, setHighlightRow] = useState(null);
  const [barcodeScannerMode, setBarcodeScannerMode] = useState(false);
  
  // Credit bill fields
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const searchInputRef = useRef(null);
  const cartContainerRef = useRef(null);
  const suggestionRefs = useRef([]);
  const customerSuggestionRefs = useRef([]);

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().slice(0, 10));
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await CustomerService.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      // Don't crash - keep empty array
      setCustomers([]);
    }
  };

  // Search customers - ✅ FIX: Handle undefined responses
  useEffect(() => {
    if (searchCustomer.length < 2 || customerType === 'new') {
      setShowCustomerDropdown(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const response = await CustomerService.search(searchCustomer);
        // ✅ FIX: Check if response.data exists and is array
        if (response?.success && Array.isArray(response.data)) {
          setCustomers(response.data);
          setShowCustomerDropdown(true);
          setCustomerSearchIndex(response.data.length > 0 ? 0 : -1);
        } else {
          // Show error but don't crash
          if (response?.error) {
            console.warn('Customer search warning:', response.error);
          }
          setCustomers([]);
          setShowCustomerDropdown(false);
        }
      } catch (error) {
        console.error('Search customers error:', error);
        setCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchCustomer, customerType]);

  // ✅ FIX: Calculate totals with useMemo (safe for hooks)
  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalDiscount = 0;
    
    if (!Array.isArray(cart)) return { totalAmount: 0, totalDiscount: 0, grandTotal: 0, itemCount: 0 };
    
    cart.forEach(item => {
      totalAmount += (item.unit_price || 0) * (item.quantity || 0);
      totalDiscount += (item.discount_lkr || 0) * (item.quantity || 0);
    });
    
    return {
      totalAmount,
      totalDiscount,
      grandTotal: Math.max(0, totalAmount - totalDiscount),
      itemCount: cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    };
  }, [cart]);
  
  const { totalAmount, totalDiscount, grandTotal, itemCount } = totals;

  // 🔍 Product search
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
        if (response?.success && Array.isArray(response.data)) {
          const filtered = response.data.filter(p => p.stock_quantity > 0).slice(0, 8);
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, barcodeScannerMode]);

  // 🎯 Keyboard Navigation - ✅ FIX: Safe array access
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCreateBill();
      }
      
      // Customer dropdown navigation - ✅ FIX: Check customers is array
      if (showCustomerDropdown && Array.isArray(customers) && customers.length > 0 && customerType === 'existing') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCustomerSearchIndex(prev => {
            const next = prev < customers.length - 1 ? prev + 1 : prev;
            customerSuggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCustomerSearchIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            customerSuggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'Enter' && customerSearchIndex >= 0 && !showSuggestions) {
          e.preventDefault();
          if (customers[customerSearchIndex]) {
            const cust = customers[customerSearchIndex];
            setSelectedCustomer(cust);
            setShowCustomerDropdown(false);
            setSearchCustomer(`${cust.name}${cust.company_name ? ` - ${cust.company_name}` : ''}`);
          }
        }
      }
      
      // Product suggestions navigation - ✅ FIX: Check suggestions is array
      if (showSuggestions && Array.isArray(suggestions) && suggestions.length > 0) {
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
        }
      }
      
      // ESC to close dropdowns
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setShowCustomerDropdown(false);
        setSelectedSuggestionIndex(-1);
        setCustomerSearchIndex(-1);
        if (!barcodeScannerMode) {
          setSearchQuery('');
        }
        searchInputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCustomerDropdown, showSuggestions, suggestions, customers, selectedSuggestionIndex, customerSearchIndex, barcodeScannerMode, cart]);

  // 🛒 Add to cart - ✅ FIX: Null checks
  const addToCart = useCallback((product) => {
    if (!product || !product.id) return;
    
    if ((product.stock_quantity || 0) <= 0) {
      toast.error(`❌ Out of stock: ${product.item_name}`);
      return;
    }
    
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existing = safePrev.find(item => item.product_id === product.id);
      if (existing) {
        const newQty = (existing.quantity || 0) + 1;
        if (newQty > (product.stock_quantity || 0)) {
          toast.error(`⚠️ Max stock: ${product.stock_quantity}`);
          return prev;
        }
        return safePrev.map(item =>
          item.product_id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      
      const autoDiscount = (product.discount_type === 'percent')
        ? (product.selling_price || 0) * (product.discount_value || 0) / 100
        : (product.discount_value || 0);
      
      return [...safePrev, {
        product_id: product.id,
        product_name: product.item_name || '',
        barcode: product.barcode || '',
        short_form: product.short_form || '',
        unit_price: product.selling_price || 0,
        quantity: 1,
        max_stock: product.stock_quantity || 0,
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

  // 📦 Handle search submit
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (barcodeScannerMode) {
      try {
        const response = await ProductService.getAll({ search: searchQuery.trim() });
        if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
          const exactMatch = response.data.find(p => 
            p.barcode === searchQuery.trim()
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
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        const exactMatch = response.data.find(p => 
          p.barcode === searchQuery.trim()
        );
        if (exactMatch) {
          addToCart(exactMatch);
          return;
        }
      }
    } catch (error) {
      console.error('Lookup error:', error);
    }
    
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      const index = selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length 
        ? selectedSuggestionIndex 
        : 0;
      if (suggestions[index]) {
        addToCart(suggestions[index]);
      }
    }
  };

  // Handle input change
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

  // 🔄 Update cart item - ✅ FIX: Null checks
  const updateCartItem = (productId, field, value) => {
    setCart(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(item => {
        if (item.product_id !== productId) return item;
        
        let updated = { ...item };
        
        if (field === 'quantity') {
          const qty = parseInt(value) || 0;
          if (qty <= 0) {
            toast.error('⚠️ Quantity must be at least 1');
            return item;
          }
          if (qty > (item.max_stock || 0)) {
            toast.error(`⚠️ Max stock: ${item.max_stock}`);
            return item;
          }
          updated.quantity = qty;
        } else if (field === 'discount_mode') {
          updated.discount_mode = value;
          if (value === 'default') {
            updated.discount_lkr = item.auto_discount_lkr || 0;
            updated.discount_value = item.discount_value || 0;
            updated.discount_type = item.discount_type || 'fixed';
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
              updated.discount_lkr = item.unit_price || 0;
            } else {
              updated.discount_lkr = (item.unit_price || 0) * val / 100;
            }
          } else if (updated.discount_mode === 'fixed') {
            if (val > (item.unit_price || 0)) {
              toast.error('⚠️ Discount cannot exceed unit price');
              updated.discount_value = item.unit_price || 0;
              updated.discount_lkr = item.unit_price || 0;
            } else {
              updated.discount_lkr = val;
            }
          }
        }
        
        return updated;
      });
    });
  };

  // 🗑️ Remove from cart
  const removeFromCart = (productId) => {
    setCart(prev => Array.isArray(prev) ? prev.filter(item => item.product_id !== productId) : []);
  };

  // 🧹 Clear cart
  const clearCart = () => {
    if (!Array.isArray(cart) || cart.length === 0) return;
    if (window.confirm('🗑️ Clear all items from cart?')) {
      setCart([]);
      toast.success('Cart cleared');
    }
  };

  // Create new customer - ✅ FIX: Proper validation
  const handleCreateCustomer = async () => {
    // Trim and validate required fields
    const name = newCustomer.name?.trim();
    const mobile = newCustomer.mobile?.trim();
    const address = newCustomer.address?.trim();
    const city = newCustomer.city?.trim();
    
    if (!name || !mobile || !address || !city) {
      toast.error('❌ Please fill all required fields (Name, Mobile, Address, City)');
      return false;
    }
    
    // Validate mobile format (Sri Lankan)
    if (!/^07[01245678]\d{7}$/.test(mobile)) {
      toast.error('❌ Please enter a valid mobile number (07X XXX XXXX)');
      return false;
    }
    
    try {
      const response = await CustomerService.create({
        ...newCustomer,
        name,
        mobile,
        address,
        city,
        company_name: newCustomer.company_name?.trim() || null,
        email: newCustomer.email?.trim() || null,
        nic_id: newCustomer.nic_id?.trim() || null
      });
      
      if (response?.success && response.data) {
        setSelectedCustomer(response.data);
        toast.success('✅ Customer created successfully');
        fetchCustomers(); // Refresh list
        return true;
      } else {
        toast.error(response?.error || '❌ Failed to create customer');
        return false;
      }
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('❌ Network error - please check connection');
      return false;
    }
  };

  // Create credit bill - ✅ FIX: Comprehensive validation
  // ✅ FIXED: Create credit bill - handle new customer creation properly
const handleCreateBill = async () => {
  let customer = selectedCustomer; // Start with existing selection
  
  // ✅ If new customer, create FIRST and use the returned object directly
  if (customerType === 'new') {
    // Validate new customer form
    const name = newCustomer.name?.trim();
    const mobile = newCustomer.mobile?.trim();
    const address = newCustomer.address?.trim();
    const city = newCustomer.city?.trim();
    
    if (!name || !mobile || !address || !city) {
      toast.error('❌ Please fill all required fields (Name, Mobile, Address, City)');
      return;
    }
    
    if (!/^07[01245678]\d{7}$/.test(mobile)) {
      toast.error('❌ Invalid mobile format. Use: 07X XXX XXXX');
      return;
    }
    
    try {
      // Create customer
      const createResponse = await CustomerService.create({
        customer_type: newCustomer.customer_type || 'individual',
        name,
        company_name: newCustomer.company_name?.trim() || null,
        mobile,
        email: newCustomer.email?.trim() || null,
        address,
        city,
        nic_id: newCustomer.nic_id?.trim() || null
      });
      
      if (!createResponse?.success || !createResponse.data) {
        toast.error(createResponse?.error || '❌ Failed to create customer');
        return;
      }
      
      // ✅ CRITICAL FIX: Use the created customer object directly, NOT state
      customer = createResponse.data;
      
      // Update state for UI (but don't wait for it)
      setSelectedCustomer(customer);
      toast.success('✅ Customer created successfully');
      fetchCustomers(); // Refresh list for future use
      
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('❌ Network error creating customer');
      return;
    }
  } else {
    // Existing customer - validate selection
    if (!selectedCustomer || !selectedCustomer.id) {
      toast.error('❌ Please select a customer');
      return;
    }
    customer = selectedCustomer;
  }
  
  // ✅ Now customer is guaranteed to have an ID (either existing or newly created)
  console.log('✅ Billing with customer:', customer);
  
  // Validate cart
  if (!Array.isArray(cart) || cart.length === 0) {
    toast.error('❌ Cart is empty');
    return;
  }
  
  // Validate totals
  if (grandTotal <= 0) {
    toast.error('❌ Invalid bill total');
    return;
  }
  
  // Validate due date
  if (!dueDate) {
    toast.error('❌ Please select due date');
    return;
  }
  
  setProcessing(true);
  try {
    const billItems = cart.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      barcode: item.barcode,
      unit_price: parseFloat(item.unit_price) || 0,
      quantity: parseInt(item.quantity) || 1,
      discount_lkr: parseFloat(item.discount_lkr) || 0
    }));
    
    // ✅ Use the customer object we have (not state)
    const response = await CreditBillService.create({
      customer_id: customer.id, // ✅ This now works!
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      items: billItems,
      due_date: dueDate,
      notes: notes?.trim() || null
    });
    
    if (response?.success && response.data) {
      toast.success(`✅ Credit Bill #${response.data.billNumber} saved!`);
      openReceiptPrint(response.data, cart, customer);
      
      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setCustomerType('existing');
      setSearchQuery('');
      setSearchCustomer('');
      setNotes('');
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setDueDate(defaultDue.toISOString().slice(0, 10));
      searchInputRef.current?.focus();
    } else {
      toast.error(response?.error || '❌ Billing failed');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    toast.error(error.message || '❌ Billing failed - please try again');
  } finally {
    setProcessing(false);
  }
};

  // 🧾 Print receipt
  const openReceiptPrint = (billData, cartItems, customer) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    const safeTotalAmount = totalAmount || 0;
    const safeTotalDiscount = totalDiscount || 0;
    const safeGrandTotal = grandTotal || 0;
    const safeOutstanding = customer?.outstanding_balance || 0;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Bill - ${billData.billNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; font-size: 10px; padding: 8px; margin: 0; background: #fff; color: #000; }
          .header { text-align: center; margin-bottom: 8px; border-bottom: 2px dashed #000; padding-bottom: 8px; }
          .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
          .header p { margin: 2px 0; font-size: 9px; }
          .customer-info { margin-bottom: 8px; font-size: 9px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
          .customer-info div { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 9px; font-weight: bold; }
          td { padding: 3px 0; font-size: 9px; }
          .totals { border-top: 2px dashed #000; padding-top: 6px; margin-top: 6px; }
          .totals div { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; }
          .grand-total { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          .outstanding { background: #7c3aed; color: #fff; padding: 6px; margin-top: 6px; text-align: center; font-weight: bold; font-size: 12px; }
          .footer { text-align: center; margin-top: 12px; font-size: 8px; border-top: 1px dashed #000; padding-top: 6px; }
          .credit-badge { background: #7c3aed; color: #fff; padding: 2px 8px; font-weight: bold; font-size: 9px; border-radius: 3px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SAMAGI HARDWARE</h2>
          <p>POS System - <span class="credit-badge">CREDIT BILL</span></p>
          <p>${new Date().toLocaleString('en-LK')}</p>
        </div>
        <div class="customer-info">
          <div><strong>Bill #:</strong> ${billData.billNumber}</div>
          <div><strong>Customer:</strong> ${customer?.name || 'N/A'}${customer?.company_name ? ` (${customer.company_name})` : ''}</div>
          <div><strong>Mobile:</strong> ${customer?.mobile || 'N/A'}</div>
          <div><strong>Address:</strong> ${customer?.address || 'N/A'}, ${customer?.city || 'N/A'}</div>
          <div><strong>Due Date:</strong> ${billData.due_date ? new Date(billData.due_date).toLocaleDateString('en-LK') : 'N/A'}</div>
          ${safeOutstanding > 0 ? `<div><strong>Previous Outstanding:</strong> LKR ${safeOutstanding.toFixed(2)}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40%">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Disc</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(cartItems) ? cartItems.map(item => `
              <tr>
                <td>${item.product_name || 'N/A'}<br><span style="font-size:8px;color:#666">${item.barcode || ''}</span></td>
                <td style="text-align:center">${item.quantity || 1}</td>
                <td style="text-align:right">${(item.unit_price || 0).toFixed(2)}</td>
                <td style="text-align:right;color:red">${(item.discount_lkr || 0) > 0 ? '-' + ((item.discount_lkr * item.quantity) || 0).toFixed(2) : '-'}</td>
                <td style="text-align:right;font-weight:bold">${(((item.unit_price || 0) * (item.quantity || 1)) - ((item.discount_lkr || 0) * (item.quantity || 1))).toFixed(2)}</td>
              </tr>
            `).join('') : ''}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal:</span><span>LKR ${safeTotalAmount.toFixed(2)}</span></div>
          <div style="color:red"><span>Discount:</span><span>- LKR ${safeTotalDiscount.toFixed(2)}</span></div>
          <div class="grand-total"><span>TOTAL:</span><span>LKR ${safeGrandTotal.toFixed(2)}</span></div>
        </div>
        <div class="outstanding">
          NEW OUTSTANDING: LKR ${(safeGrandTotal + safeOutstanding).toFixed(2)}
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Please settle the bill by the due date</p>
          <p>Cashier: ${billData.cashier || 'N/A'}</p>
        </div>
        <script>
          window.onload = () => { setTimeout(() => window.print(), 300); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Professional Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl shadow-lg">
                💳
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Credit Billing</h1>
                <p className="text-sm text-gray-500">Create credit/loan bills for customers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-purple-100 border border-purple-200 rounded-xl">
                <span className="text-sm font-bold text-purple-700">CREDIT ONLY</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          
          {/* LEFT: Customer + Search + Cart (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            {/* Customer Selection Panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Customer Information
              </h3>
              
              {/* Radio Buttons */}
              <div className="flex gap-4 mb-6">
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  customerType === 'existing'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}>
                  <input
                    type="radio"
                    value="existing"
                    checked={customerType === 'existing'}
                    onChange={(e) => {
                      setCustomerType(e.target.value);
                      setSelectedCustomer(null);
                      setSearchCustomer('');
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      customerType === 'existing' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                    }`}>
                      {customerType === 'existing' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Existing Customer</p>
                      <p className="text-xs text-gray-500">Select from customer list</p>
                    </div>
                  </div>
                </label>
                
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  customerType === 'new'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}>
                  <input
                    type="radio"
                    value="new"
                    checked={customerType === 'new'}
                    onChange={(e) => {
                      setCustomerType(e.target.value);
                      setSelectedCustomer(null);
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      customerType === 'new' ? 'border-green-500 bg-green-500' : 'border-gray-400'
                    }`}>
                      {customerType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">New Customer</p>
                      <p className="text-xs text-gray-500">Create new customer profile</p>
                    </div>
                  </div>
                </label>
              </div>
              
              {/* Existing Customer Search */}
              {customerType === 'existing' && (
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Search Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      placeholder="Type name, mobile, or company name..."
                      className="input-pos pl-10 pr-4"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* ✅ FIX: Check customers is array before mapping */}
                  {showCustomerDropdown && Array.isArray(customers) && customers.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      {customers.map((customer, index) => (
                        <button
  key={customer?.id || index}
  ref={el => customerSuggestionRefs.current[index] = el}
  onClick={() => {
    if (customer?.id) { // ✅ Check ID exists
      setSelectedCustomer(customer);
      setShowCustomerDropdown(false);
      setSearchCustomer(`${customer.name}${customer.company_name ? ` - ${customer.company_name}` : ''}`);
      toast.success(`✓ Selected: ${customer.name}`); // ✅ Feedback
    }
  }}
  className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 transition-all ${
    index === customerSearchIndex ? 'bg-blue-100 border-l-4 border-l-blue-600' : 'hover:bg-blue-50'
  }`}
>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`font-bold ${index === customerSearchIndex ? 'text-blue-700' : 'text-gray-900'}`}>
                                {customer?.name || 'N/A'}
                              </p>
                              {customer?.company_name && (
                                <p className="text-xs text-gray-600 mt-0.5">{customer.company_name}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                📞 {customer?.mobile || 'N/A'} • 📍 {customer?.city || 'N/A'}
                              </p>
                            </div>
                            {(customer?.outstanding_balance || 0) > 0 && (
                              <div className="text-right">
                                <p className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                  Outstanding
                                </p>
                                <p className="text-sm font-bold text-red-700 mt-1">
                                  LKR {(customer.outstanding_balance || 0).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-blue-900 text-lg">{selectedCustomer?.name || 'N/A'}</p>
                          {selectedCustomer?.company_name && (
                            <p className="text-sm text-blue-700 font-medium">{selectedCustomer.company_name}</p>
                          )}
                          <p className="text-sm text-blue-600 mt-1">📞 {selectedCustomer?.mobile || 'N/A'}</p>
                          <p className="text-sm text-gray-600">📍 {selectedCustomer?.address || 'N/A'}, {selectedCustomer?.city || 'N/A'}</p>
                        </div>
                        {(selectedCustomer?.outstanding_balance || 0) > 0 && (
                          <div className="text-right">
                            <p className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                              ⚠️ Current Outstanding
                            </p>
                            <p className="text-xl font-black text-red-700 mt-2">
                              LKR {(selectedCustomer.outstanding_balance || 0).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* New Customer Form */}
              {customerType === 'new' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Customer Type
                    </label>
                    <select
                      value={newCustomer.customer_type}
                      onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value})}
                      className="input-pos"
                    >
                      <option value="individual">👤 Individual</option>
                      <option value="company">🏢 Company</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="input-pos"
                      placeholder="Full name"
                    />
                  </div>
                  
                  {newCustomer.customer_type === 'company' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={newCustomer.company_name}
                        onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                        className="input-pos"
                        placeholder="Company name"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.mobile}
                      onChange={(e) => setNewCustomer({...newCustomer, mobile: e.target.value})}
                      className="input-pos"
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      className="input-pos"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="input-pos"
                      rows={2}
                      placeholder="Street address, area"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      className="input-pos"
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      NIC/ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCustomer.nic_id}
                      onChange={(e) => setNewCustomer({...newCustomer, nic_id: e.target.value})}
                      className="input-pos"
                      placeholder="National ID number"
                    />
                  </div>
                </div>
              )}
            </div>
            
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
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors">
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
                    <span className="text-xs font-bold text-green-700">Ready to Scan</span>
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
                          : 'border-gray-200 focus:border-purple-500 focus:bg-white'
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
                      <kbd className="hidden sm:inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono font-bold text-gray-600">
                        ESC
                      </kbd>
                    </div>
                  </div>
                  
                  {!barcodeScannerMode && (
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              </form>
              
              {/* Keyboard Instructions */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono font-bold">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono font-bold">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono font-bold">ESC</kbd>
                  Cancel
                </span>
              </div>
              
              {/* Auto-suggestions Dropdown - ✅ FIX: Check array */}
              {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                  {suggestions.map((product, index) => (
                    <button
                      key={product?.id || index}
                      ref={el => suggestionRefs.current[index] = el}
                      onClick={() => product && addToCart(product)}
                      className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 flex justify-between items-center transition-all group ${
                        index === selectedSuggestionIndex
                          ? 'bg-purple-100 border-l-4 border-l-purple-600'
                          : 'hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${index === selectedSuggestionIndex ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-700'}`}>
                            {product?.item_name || 'N/A'}
                          </p>
                          {(product?.discount_value || 0) > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">
                              -{product.discount_value}{product.discount_type === 'percent' ? '%' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded font-semibold">{product?.barcode || ''}</span>
                          {product?.short_form && <span className="ml-2">• {product.short_form}</span>}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-purple-700 text-lg">{formatLKR(product?.selling_price)}</p>
                        <p className="text-xs text-gray-500">Stock: <span className={(product?.stock_quantity || 0) <= 10 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{product?.stock_quantity || 0}</span></p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cart Table - ✅ FIX: Handle empty/undefined cart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex-1 overflow-hidden flex flex-col">
              {/* Cart Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold shadow-md">
                    {itemCount}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Cart Items</h3>
                </div>
                <button 
                  onClick={clearCart} 
                  disabled={!Array.isArray(cart) || cart.length === 0}
                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All (F4)
                </button>
              </div>
              
              {/* Cart Content */}
              <div className="flex-1 overflow-auto" ref={cartContainerRef}>
                {!Array.isArray(cart) || cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                    <div className="text-7xl mb-4 opacity-30">🛒</div>
                    <p className="text-lg font-bold text-gray-600">Cart is empty</p>
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
                          key={item?.product_id || index} 
                          className={`transition-all duration-200 ${
                            highlightRow === item?.product_id 
                              ? 'bg-purple-50 ring-2 ring-purple-500/30' 
                              : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } hover:bg-purple-50/50`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold text-lg flex-shrink-0 shadow-sm">
                                {(item?.product_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{item?.product_name || 'N/A'}</p>
                                <p className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 rounded font-semibold">{item?.barcode || ''}</p>
                                {item?.short_form && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                      {item.short_form}
                                    </span>
                                  </div>
                                )}
                                {(item?.discount_lkr || 0) > 0 && (
                                  <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
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
                                max={item?.max_stock || 999}
                                value={item?.quantity || 1}
                                onChange={(e) => updateCartItem(item?.product_id, 'quantity', e.target.value)}
                                className="w-20 text-center border-2 border-gray-200 rounded-xl py-2 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              />
                              <p className="text-[10px] text-gray-400 font-semibold">Max: {item?.max_stock || 0}</p>
                            </div>
                          </td>
                          
                          {/* Unit Price */}
                          <td className="px-4 py-4 text-right font-bold text-gray-900">
                            {formatLKR(item?.unit_price)}
                          </td>
                          
                          {/* Discount Controls */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <select
                                value={item?.discount_mode || 'default'}
                                onChange={(e) => updateCartItem(item?.product_id, 'discount_mode', e.target.value)}
                                className="w-full text-xs border-2 border-gray-200 rounded-lg py-2 px-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-bold"
                              >
                                <option value="default">🤖 Default (Auto)</option>
                                <option value="percent">📊 Manual %</option>
                                <option value="fixed">💵 Manual LKR</option>
                              </select>
                              
                              <div className="relative w-full">
                                <input
                                  type="number"
                                  min="0"
                                  step={(item?.discount_mode === 'percent') ? "1" : "0.01"}
                                  max={(item?.discount_mode === 'percent') ? "100" : (item?.unit_price || 0)}
                                  value={item?.discount_value || 0}
                                  onChange={(e) => updateCartItem(item?.product_id, 'discount_value', e.target.value)}
                                  disabled={(item?.discount_mode || 'default') === 'default'}
                                  className={`w-full text-right border-2 rounded-lg py-2 font-bold transition-all pl-8 ${
                                    (item?.discount_mode || 'default') === 'default'
                                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                                  }`}
                                  placeholder={(item?.discount_mode === 'percent') ? '0%' : '0.00'}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                  {(item?.discount_mode === 'percent') ? '%' : 'Rs'}
                                </span>
                              </div>
                              
                              {(item?.discount_lkr || 0) > 0 && (
                                <p className="text-[10px] text-green-600 font-bold">
                                  Saved: {formatLKR((item.discount_lkr || 0) * (item.quantity || 1))}
                                </p>
                              )}
                            </div>
                          </td>
                          
                          {/* Subtotal */}
                          <td className="px-4 py-4 text-right font-black text-purple-700 text-xl">
                            {formatLKR(((item?.unit_price || 0) * (item?.quantity || 1)) - ((item?.discount_lkr || 0) * (item?.quantity || 1)))}
                          </td>
                          
                          {/* Action */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => item?.product_id && removeFromCart(item.product_id)}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-lg">
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
                  <span className="text-sm font-bold">Subtotal</span>
                  <span className="font-bold text-lg">{formatLKR(totalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center text-green-600 p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-sm font-bold">Total Discount</span>
                  <span className="font-bold text-lg">- {formatLKR(totalDiscount)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center shadow-lg">
                    <p className="text-sm font-bold">
                      🎉 Customer Saved: <strong>{formatLKR(totalDiscount)}</strong>
                    </p>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <span className="text-4xl font-black text-purple-700">{formatLKR(grandTotal)}</span>
                </div>
                
                {/* Outstanding Info */}
                {selectedCustomer && (selectedCustomer.outstanding_balance || 0) > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 p-4 rounded-xl">
                    <p className="text-xs font-bold text-red-800 mb-1">Current Outstanding</p>
                    <p className="text-2xl font-black text-red-700">LKR {(selectedCustomer.outstanding_balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-red-600 mt-2 font-semibold">
                      New Total: LKR {((selectedCustomer.outstanding_balance || 0) + grandTotal).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Due Date */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="input-pos font-bold"
                />
              </div>
              
              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-pos"
                  rows={3}
                  placeholder="Additional notes about this credit bill..."
                />
              </div>
              
              {/* Create Bill Button */}
              <button
                onClick={handleCreateBill}
                disabled={processing || !Array.isArray(cart) || cart.length === 0 || grandTotal <= 0 || !dueDate || (customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id))}
                className={`w-full py-4 font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 mb-4 ${
                  processing || !Array.isArray(cart) || cart.length === 0 || grandTotal <= 0 || !dueDate || (customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id))
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow-xl hover:scale-[1.02]'
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Credit Bill (F9)
                  </>
                )}
              </button>
              
              {/* Validation Messages */}
              <div className="space-y-2">
                {customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id) && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1 font-semibold">
                    <span>⚠️</span>
                    <span>Please select a customer first</span>
                  </p>
                )}
                {(!Array.isArray(cart) || cart.length === 0) && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1 font-semibold">
                    <span>⚠️</span>
                    <span>Add items to cart</span>
                  </p>
                )}
              </div>
              
              {/* Security Badge */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4 mb-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 3.04A12.02 12.02 0 0112 5.5c0 3.037-1.15 5.776-3.04 7.618" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Credit Transaction</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Stock deducted immediately. Outstanding balance updated. Customer must pay by due date.
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
                    { key: 'F9', label: 'Create Bill', icon: '📄', color: 'purple' },
                    { key: 'Enter', label: 'Add Product', icon: '➕', color: 'green' },
                  ].map(({ key, label, icon, color }) => (
                    <div key={key} className={`flex items-center gap-2 text-xs bg-${color}-50 p-2.5 rounded-lg border border-${color}-100`}>
                      <kbd className={`px-2 py-1 bg-white rounded border-2 border-${color}-300 font-mono font-bold text-${color}-700 shadow-sm`}>
                        {key}
                      </kbd>
                      <span className="flex items-center gap-1 text-gray-700">
                        <span>{icon}</span>
                        <span className="font-bold">{label}</span>
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

export default CreditBilling;