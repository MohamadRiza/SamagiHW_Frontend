import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import PurchaseService from '../services/purchase.service';
import { Toaster, toast } from 'react-hot-toast';

const Purchases = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    bill_type: '',
    dateFrom: '',
    dateTo: '',
    showOutstanding: false,
    sortBy: 'purchase_date',
    order: 'DESC'
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    bill_type: 'cash',
    bill_amount: '',
    outstanding_amount: '',
    paid_amount: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: '',
    bill_file: null
  });
  const [formLoading, setFormLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ purchase_id: '', paid_amount: '' });
  
  // View details modal
  const [viewingPurchase, setViewingPurchase] = useState(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchPurchases();
    fetchStats();
  }, [filters]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await PurchaseService.getAll(filters);
      if (response?.success && Array.isArray(response.data)) {
        setPurchases(response.data);
      } else {
        if (response?.error) toast.error(response.error);
        setPurchases([]);
      }
    } catch (error) {
      console.error('Fetch purchases error:', error);
      toast.error('Network error loading purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await PurchaseService.getStats(filters);
      if (response?.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  // Format currency
  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate outstanding for credit
    if (field === 'bill_type') {
      if (value === 'cash') {
        setFormData(prev => ({
          ...prev,
          outstanding_amount: '0',
          paid_amount: prev.bill_amount
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          outstanding_amount: prev.bill_amount,
          paid_amount: '0'
        }));
      }
    }
    
    // Auto-calculate outstanding when bill amount changes
    if (field === 'bill_amount' && formData.bill_type === 'cash') {
      setFormData(prev => ({
        ...prev,
        paid_amount: value,
        outstanding_amount: '0'
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only PDF, JPG, JPEG, and PNG files are allowed');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, bill_file: file }));
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewFile(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewFile(null);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      bill_type: 'cash',
      bill_amount: '',
      outstanding_amount: '',
      paid_amount: '',
      purchase_date: new Date().toISOString().slice(0, 10),
      notes: '',
      bill_file: null
    });
    setEditingPurchase(null);
    setPreviewFile(null);
  };

  // Open form for new purchase
  const openNewPurchaseForm = () => {
    resetForm();
    setShowForm(true);
  };

  // Open form for editing purchase
  const openEditPurchaseForm = (purchase) => {
    setFormData({
      title: purchase.title,
      bill_type: purchase.bill_type,
      bill_amount: purchase.bill_amount.toString(),
      outstanding_amount: purchase.outstanding_amount.toString(),
      paid_amount: purchase.paid_amount.toString(),
      purchase_date: purchase.purchase_date,
      notes: purchase.notes || ''
    });
    setEditingPurchase(purchase);
    setShowForm(true);
  };

  // Open payment modal
  const openPaymentModal = (purchase) => {
    setPaymentData({
      purchase_id: purchase.id,
      paid_amount: ''
    });
    setShowPaymentModal(true);
  };

  // Open view details modal
  const openViewDetailsModal = (purchase) => {
    setViewingPurchase(purchase);
  };

  // Handle form submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    
    const billAmount = parseFloat(formData.bill_amount);
    if (isNaN(billAmount) || billAmount <= 0) {
      toast.error('Bill amount must be a positive number');
      return;
    }
    
    if (!formData.purchase_date) {
      toast.error('Purchase date is required');
      return;
    }
    
    setFormLoading(true);
    
    try {
      const purchaseData = {
        title: formData.title.trim(),
        bill_type: formData.bill_type,
        bill_amount: billAmount,
        outstanding_amount: formData.bill_type === 'credit' ? parseFloat(formData.outstanding_amount) || billAmount : 0,
        paid_amount: formData.bill_type === 'cash' ? billAmount : (parseFloat(formData.paid_amount) || 0),
        purchase_date: formData.purchase_date,
        notes: formData.notes?.trim() || null,
        bill_file: formData.bill_file
      };
      
      let response;
      if (editingPurchase) {
        response = await PurchaseService.update(editingPurchase.id, purchaseData);
        if (response?.success) {
          toast.success('✅ Purchase updated successfully');
        }
      } else {
        response = await PurchaseService.create(purchaseData);
        if (response?.success) {
          toast.success('✅ Purchase added successfully');
        }
      }
      
      if (response?.success) {
        setShowForm(false);
        resetForm();
        fetchPurchases();
        fetchStats();
      } else {
        toast.error(response?.error || 'Failed to save purchase');
      }
    } catch (error) {
      console.error('Submit purchase error:', error);
      toast.error('Network error saving purchase');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle payment submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentData.paid_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    try {
      const response = await PurchaseService.updatePayment(paymentData.purchase_id, {
        paid_amount: amount
      });
      
      if (response?.success) {
        toast.success('✅ Payment recorded successfully');
        setShowPaymentModal(false);
        fetchPurchases();
        fetchStats();
      } else {
        toast.error(response?.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Network error recording payment');
    }
  };

  // Handle delete purchase (admin only)
  const handleDeletePurchase = async (purchase) => {
    if (!isAdmin) {
      toast.error('Only admins can delete purchases');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this purchase?\n\nTitle: ${purchase.title}\nAmount: ${formatLKR(purchase.bill_amount)}`)) {
      return;
    }
    
    try {
      const response = await PurchaseService.delete(purchase.id);
      if (response?.success) {
        toast.success('✅ Purchase deleted');
        fetchPurchases();
        fetchStats();
      } else {
        toast.error(response?.error || 'Failed to delete purchase');
      }
    } catch (error) {
      console.error('Delete purchase error:', error);
      toast.error('Network error deleting purchase');
    }
  };

  // Get type badge style
  const getTypeBadge = (type) => {
    return type === 'credit' 
      ? { label: '📝 Credit', class: 'bg-blue-100 text-blue-700 border-blue-200' }
      : { label: '💵 Cash', class: 'bg-green-100 text-green-700 border-green-200' };
  };

  // Get payment status badge
  const getPaymentStatus = (purchase) => {
    if (purchase.bill_type === 'cash') {
      return { label: '✓ Paid', class: 'bg-green-100 text-green-700' };
    }
    
    if (purchase.outstanding_amount <= 0) {
      return { label: '✓ Fully Paid', class: 'bg-green-100 text-green-700' };
    } else if (purchase.paid_amount > 0) {
      return { label: '◐ Partial', class: 'bg-amber-100 text-amber-700' };
    } else {
      return { label: '○ Unpaid', class: 'bg-red-100 text-red-700' };
    }
  };

  // Filter purchases client-side
  const filteredPurchases = useMemo(() => {
    let result = Array.isArray(purchases) ? [...purchases] : [];
    
    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(term) ||
        p.notes?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [purchases, filters.search]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
              <p className="text-sm text-gray-500 mt-1">Track purchases from credit and cash</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={openNewPurchaseForm}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Purchase
              </button>
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Purchases */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Purchases</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats?.total_purchases || 0}</p>
              <p className="text-xs text-blue-600 mt-1">{stats?.credit_count || 0} credit • {stats?.cash_count || 0} cash</p>
            </div>
            
            {/* Total Amount */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Total Value</p>
              <p className="text-xl font-black text-purple-700 mt-1">{formatLKR(stats?.total_amount)}</p>
              <p className="text-xs text-purple-600 mt-1">All purchases</p>
            </div>
            
            {/* Credit Outstanding */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-xs text-red-600 font-medium">Credit Outstanding</p>
              <p className="text-xl font-black text-red-700 mt-1">{formatLKR(stats?.total_outstanding)}</p>
              <p className="text-xs text-red-600 mt-1">Pending payment</p>
            </div>
            
            {/* Credit Paid */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium">Credit Paid</p>
              <p className="text-xl font-black text-green-700 mt-1">{formatLKR(stats?.total_credit_paid)}</p>
              <p className="text-xs text-green-600 mt-1">From credit purchases</p>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* First Row - Search and Type */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Search by title or notes..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={filters.bill_type}
                  onChange={(e) => setFilters({...filters, bill_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="credit">📝 Credit</option>
                  <option value="cash">💵 Cash</option>
                </select>
              </div>
              
              <div className="w-full md:w-auto flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.showOutstanding}
                    onChange={(e) => setFilters({...filters, showOutstanding: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Show Outstanding Only</span>
                </label>
              </div>
            </div>
            
            {/* Second Row - Date Range and Sort */}
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="purchase_date">Date</option>
                    <option value="bill_amount">Amount</option>
                    <option value="outstanding_amount">Outstanding</option>
                    <option value="title">Title</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
                  <button
                    onClick={() => setFilters({...filters, order: filters.order === 'ASC' ? 'DESC' : 'ASC'})}
                    className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[50px]"
                    title={`Sort ${filters.order === 'ASC' ? 'Ascending' : 'Descending'}`}
                  >
                    {filters.order === 'ASC' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => { fetchPurchases(); fetchStats(); }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 h-[42px]"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Purchases Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading purchases...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-lg font-semibold text-gray-600">No purchases found</p>
              <p className="text-sm text-gray-500 mt-1">Add your first purchase or adjust filters</p>
              <button
                onClick={openNewPurchaseForm}
                className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add First Purchase
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[150px]">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[100px]">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Bill Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Outstanding</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[100px]">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPurchases.map((purchase) => {
                      const typeBadge = getTypeBadge(purchase.bill_type);
                      const paymentStatus = getPaymentStatus(purchase);
                      const hasBill = purchase.bill_file_path;
                      
                      return (
                        <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{purchase.title}</p>
                            {purchase.notes && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{purchase.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">ID: #{purchase.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${typeBadge.class}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-bold text-gray-900 text-sm">{formatLKR(purchase.bill_amount)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-bold text-green-600 text-sm">{formatLKR(purchase.paid_amount)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className={`font-bold text-sm ${purchase.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatLKR(purchase.outstanding_amount)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{formatDate(purchase.purchase_date)}</p>
                            <p className="text-xs text-gray-500">Uploaded: {formatDate(purchase.uploaded_at)}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${paymentStatus.class}`}>
                              {paymentStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {hasBill && (
                                <a
                                  href={purchase.bill_file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View bill"
                                >
                                  📄
                                </a>
                              )}
                              {purchase.bill_type === 'credit' && purchase.outstanding_amount > 0 && (
                                <button
                                  onClick={() => openPaymentModal(purchase)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Record payment"
                                >
                                  💰
                                </button>
                              )}
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditPurchaseForm(purchase)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit purchase"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletePurchase(purchase)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete purchase"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openViewDetailsModal(purchase)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="View details"
                              >
                                👁️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* View Details Modal */}
        {viewingPurchase && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingPurchase(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">📦 Purchase Details</h3>
                <button onClick={() => setViewingPurchase(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Title</span>
                  <span className="text-sm font-semibold text-gray-900">{viewingPurchase.title}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Type</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeBadge(viewingPurchase.bill_type).class}`}>
                    {getTypeBadge(viewingPurchase.bill_type).label}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Bill Amount</p>
                    <p className="font-bold text-gray-900">{formatLKR(viewingPurchase.bill_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-bold text-green-600">{formatLKR(viewingPurchase.paid_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="font-bold text-red-600">{formatLKR(viewingPurchase.outstanding_amount)}</p>
                  </div>
                </div>
                
                <div className="py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Purchase Date</p>
                  <p className="text-sm text-gray-900">{formatDate(viewingPurchase.purchase_date)}</p>
                </div>
                
                {viewingPurchase.notes && (
                  <div className="py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{viewingPurchase.notes}</p>
                  </div>
                )}
                
                {viewingPurchase.bill_file_path && (
                  <div className="py-2">
                    <p className="text-xs text-gray-500 mb-2">Bill Document</p>
                    <a
                      href={viewingPurchase.bill_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      📄 View/Download Bill
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t">
                {viewingPurchase.bill_type === 'credit' && viewingPurchase.outstanding_amount > 0 && (
                  <button
                    onClick={() => {
                      setViewingPurchase(null);
                      openPaymentModal(viewingPurchase);
                    }}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    💰 Record Payment
                  </button>
                )}
                <button
                  onClick={() => setViewingPurchase(null)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Purchase Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingPurchase ? '✏️ Edit Purchase' : '📦 Add New Purchase'}
                </h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="e.g., Office Supplies Purchase"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                {/* Bill Type & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Bill Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.bill_type}
                      onChange={(e) => handleFormChange('bill_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="credit">📝 Credit</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Purchase Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => handleFormChange('purchase_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                {/* Bill Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Bill Amount (LKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">LKR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.bill_amount}
                      onChange={(e) => handleFormChange('bill_amount', e.target.value)}
                      className="w-full pl-14 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                {/* Payment Details - Conditional based on type */}
                {formData.bill_type === 'credit' ? (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-bold text-blue-700 mb-1">
                        Outstanding Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">LKR</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.outstanding_amount}
                          onChange={(e) => handleFormChange('outstanding_amount', e.target.value)}
                          className="w-full pl-14 pr-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Amount to be paid later</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-blue-700 mb-1">
                        Paid Amount (if any)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">LKR</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.paid_amount}
                          onChange={(e) => handleFormChange('paid_amount', e.target.value)}
                          className="w-full pl-14 pr-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">Initial payment (optional)</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">
                      ✅ Cash purchase - Full amount will be marked as paid
                    </p>
                  </div>
                )}
                
                {/* Upload Bill */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Upload Bill (PDF/JPG/JPEG/PNG)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          {formData.bill_file ? formData.bill_file.name : 'Click to upload bill'}
                        </p>
                        <p className="text-xs text-gray-400">Max 10MB • PDF, JPG, PNG</p>
                      </div>
                    </label>
                  </div>
                  {previewFile && (
                    <div className="mt-3">
                      <img src={previewFile} alt="Bill preview" className="max-h-48 rounded-lg border border-gray-200" />
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Additional notes about this purchase..."
                  />
                </div>
                
                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Saving...
                      </>
                    ) : editingPurchase ? '✅ Update Purchase' : '💾 Save Purchase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">💰 Record Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium mb-2">Payment Details</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Outstanding:</span>
                      <span className="font-bold text-blue-900">LKR {purchases.find(p => p.id === paymentData.purchase_id)?.outstanding_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Payment Amount (LKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">LKR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentData.paid_amount}
                      onChange={(e) => setPaymentData({...paymentData, paid_amount: e.target.value})}
                      className="w-full pl-14 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    ✅ Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Purchases;