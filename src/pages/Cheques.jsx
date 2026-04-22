import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ChequeService from '../services/cheque.service';
import { Toaster, toast } from 'react-hot-toast';

const Cheques = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State
  const [cheques, setCheques] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyInputRef = useRef(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'cheque_date',
    order: 'DESC'
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCheque, setEditingCheque] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    cheque_number: '',
    amount: '',
    cheque_date: '',
    type: 'incoming',
    status: 'pending',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // View details modal
  const [viewingCheque, setViewingCheque] = useState(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchCompanies();
    fetchCheques();
  }, [filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyInputRef.current && !companyInputRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check for reminders on mount and every hour
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
    return () => clearInterval(interval);
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await ChequeService.getCompanies();
      if (response?.success && Array.isArray(response.data)) {
        setCompanies(response.data);
      }
    } catch (error) {
      console.error('Fetch companies error:', error);
    }
  };

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const response = await ChequeService.getAll(filters);
      if (response?.success && Array.isArray(response.data)) {
        setCheques(response.data);
      } else {
        if (response?.error) toast.error(response.error);
        setCheques([]);
      }
    } catch (error) {
      console.error('Fetch cheques error:', error);
      toast.error('Network error loading cheques');
      setCheques([]);
    } finally {
      setLoading(false);
    }
  };

  // Check for upcoming reminders and show notifications
  const checkReminders = async () => {
    try {
      const response = await ChequeService.getReminders();
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach(cheque => {
          const days = cheque.days_until_due;
          const type = cheque.type === 'incoming' ? 'receive' : 'pay';
          const message = days === 1 
            ? `⚠️ Cheque #${cheque.cheque_number} due TOMORROW! ${type} LKR ${cheque.amount.toLocaleString()} from ${cheque.company_name}`
            : `📅 Cheque #${cheque.cheque_number} due in 2 days. ${type} LKR ${cheque.amount.toLocaleString()} from ${cheque.company_name}`;
          
          toast(message, {
            icon: days === 1 ? '⚠️' : '📅',
            duration: 8000,
            style: {
              background: days === 1 ? '#fef3c7' : '#eff6ff',
              color: days === 1 ? '#92400e' : '#1e40af',
              border: `1px solid ${days === 1 ? '#f59e0b' : '#3b82f6'}`
            }
          });
        });
      }
    } catch (error) {
      console.error('Check reminders error:', error);
    }
  };

  // Format currency
  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
    });
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 10);
  };

  // Handle company input with autocomplete
  const handleCompanyChange = (value) => {
    setCompanySearch(value);
    setFormData(prev => ({ ...prev, company_name: value }));
    setShowCompanyDropdown(value.length >= 2);
  };

  // Filter companies for dropdown
  const filteredCompanies = useMemo(() => {
    if (companySearch.length < 2) return [];
    const term = companySearch.toLowerCase();
    return companies.filter(c => c.toLowerCase().includes(term)).slice(0, 8);
  }, [companySearch, companies]);

  // Select company from dropdown
  const selectCompany = (company) => {
    setFormData(prev => ({ ...prev, company_name: company }));
    setCompanySearch(company);
    setShowCompanyDropdown(false);
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate remind date when cheque_date changes
    if (field === 'cheque_date' && value) {
      const date = new Date(value);
      date.setDate(date.getDate() - 1);
      // Note: remind_date is auto-calculated on backend, but we can show it for info
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      company_name: '',
      cheque_number: '',
      amount: '',
      cheque_date: '',
      type: 'incoming',
      status: 'pending',
      notes: ''
    });
    setEditingCheque(null);
    setCompanySearch('');
  };

  // Open form for new cheque
  const openNewChequeForm = () => {
    resetForm();
    // Set default cheque date to today
    const today = new Date().toISOString().slice(0, 10);
    setFormData(prev => ({ ...prev, cheque_date: today }));
    setShowForm(true);
  };

  // Open form for editing cheque
  const openEditChequeForm = (cheque) => {
    setFormData({
      company_name: cheque.company_name,
      cheque_number: cheque.cheque_number,
      amount: cheque.amount.toString(),
      cheque_date: formatDateForInput(cheque.cheque_date),
      type: cheque.type,
      status: cheque.status,
      notes: cheque.notes || ''
    });
    setCompanySearch(cheque.company_name);
    setEditingCheque(cheque);
    setShowForm(true);
  };

  // Open view details modal
  const openViewDetailsModal = (cheque) => {
    setViewingCheque(cheque);
  };

  // Handle form submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.company_name.trim() || formData.company_name.trim().length < 2) {
      toast.error('Company name must be at least 2 characters');
      return;
    }
    
    if (!formData.cheque_number.trim()) {
      toast.error('Cheque number is required');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    
    if (!formData.cheque_date) {
      toast.error('Cheque date is required');
      return;
    }
    
    if (!formData.type) {
      toast.error('Please select cheque type');
      return;
    }
    
    setFormLoading(true);
    
    try {
      const chequeData = {
        company_name: formData.company_name.trim(),
        cheque_number: formData.cheque_number.trim(),
        amount,
        cheque_date: formData.cheque_date,
        type: formData.type,
        status: formData.status,
        notes: formData.notes?.trim() || null
      };
      
      let response;
      if (editingCheque) {
        response = await ChequeService.update(editingCheque.id, chequeData);
        if (response?.success) {
          toast.success('✅ Cheque updated successfully');
        }
      } else {
        response = await ChequeService.create(chequeData);
        if (response?.success) {
          toast.success('✅ Cheque added successfully');
        }
      }
      
      if (response?.success) {
        setShowForm(false);
        resetForm();
        fetchCheques();
      } else {
        toast.error(response?.error || 'Failed to save cheque');
      }
    } catch (error) {
      console.error('Submit cheque error:', error);
      toast.error('Network error saving cheque');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete cheque (admin only)
  const handleDeleteCheque = async (cheque) => {
    if (!isAdmin) {
      toast.error('Only admins can delete cheques');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this cheque?\n\nCompany: ${cheque.company_name}\nNumber: ${cheque.cheque_number}\nAmount: ${formatLKR(cheque.amount)}`)) {
      return;
    }
    
    try {
      const response = await ChequeService.delete(cheque.id);
      if (response?.success) {
        toast.success('✅ Cheque deleted');
        fetchCheques();
      } else {
        toast.error(response?.error || 'Failed to delete cheque');
      }
    } catch (error) {
      console.error('Delete cheque error:', error);
      toast.error('Network error deleting cheque');
    }
  };

  // Handle status change inline
  const handleStatusChange = async (cheque, newStatus) => {
    try {
      const response = await ChequeService.update(cheque.id, {
        ...cheque,
        status: newStatus
      });
      
      if (response?.success) {
        toast.success(`✅ Status updated to ${newStatus}`);
        fetchCheques();
      } else {
        toast.error(response?.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Network error updating status');
    }
  };

  // Filter cheques client-side
  const filteredCheques = useMemo(() => {
    let result = Array.isArray(cheques) ? [...cheques] : [];
    
    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(cheque => 
        cheque.cheque_number?.toLowerCase().includes(term) ||
        cheque.notes?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [cheques, filters.search]);

  // Stats for display
  const stats = useMemo(() => {
    const pending = filteredCheques.filter(c => c.status === 'pending').length;
    const cleared = filteredCheques.filter(c => c.status === 'cleared').length;
    const bounced = filteredCheques.filter(c => c.status === 'bounced').length;
    const totalAmount = filteredCheques.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    return { pending, cleared, bounced, totalAmount, count: filteredCheques.length };
  }, [filteredCheques]);

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      pending: { label: '⏳ Pending', class: 'bg-amber-100 text-amber-700 border-amber-200' },
      cleared: { label: '✅ Cleared', class: 'bg-green-100 text-green-700 border-green-200' },
      bounced: { label: '❌ Bounced', class: 'bg-red-100 text-red-700 border-red-200' }
    };
    return styles[status] || styles.pending;
  };

  // Get type badge style
  const getTypeBadge = (type) => {
    return type === 'incoming' 
      ? { label: '📥 Incoming', class: 'bg-blue-100 text-blue-700' }
      : { label: '📤 Outgoing', class: 'bg-purple-100 text-purple-700' };
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cheque Management</h1>
              <p className="text-sm text-gray-500 mt-1">Track incoming and outgoing cheques</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={openNewChequeForm}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Cheque
              </button>
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-600 font-medium">Pending Cheques</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{stats.pending}</p>
              <p className="text-xs text-amber-600 mt-1">Awaiting clearance</p>
            </div>
            
            {/* Cleared */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium">Cleared</p>
              <p className="text-2xl font-black text-green-700 mt-1">{stats.cleared}</p>
              <p className="text-xs text-green-600 mt-1">Successfully processed</p>
            </div>
            
            {/* Bounced */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-xs text-red-600 font-medium">Bounced</p>
              <p className="text-2xl font-black text-red-700 mt-1">{stats.bounced}</p>
              <p className="text-xs text-red-600 mt-1">Requires attention</p>
            </div>
            
            {/* Total Amount */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-600 font-medium">Total Value</p>
              <p className="text-xl font-black text-indigo-700 mt-1">{formatLKR(stats.totalAmount)}</p>
              <p className="text-xs text-indigo-600 mt-1">{stats.count} cheques</p>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* First Row - Search and Company */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Search by cheque # or notes..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="relative w-full md:w-64" ref={companyInputRef}>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  onFocus={() => companySearch.length >= 2 && setShowCompanyDropdown(true)}
                  placeholder="Type or select company..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {showCompanyDropdown && filteredCompanies.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCompanies.map((company, index) => (
                      <button
                        key={index}
                        onClick={() => selectCompany(company)}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm transition-colors"
                      >
                        {company}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Second Row - Type, Status, Date Range */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="incoming">📥 Incoming</option>
                    <option value="outgoing">📤 Outgoing</option>
                  </select>
                </div>
                
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="cleared">✅ Cleared</option>
                    <option value="bounced">❌ Bounced</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="cheque_date">Date</option>
                      <option value="amount">Amount</option>
                      <option value="company_name">Company</option>
                      <option value="cheque_number">Cheque #</option>
                      <option value="status">Status</option>
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
                  onClick={fetchCheques}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 h-[42px]"
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
        </div>
        
        {/* Cheques Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading cheques...</p>
            </div>
          ) : filteredCheques.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-lg font-semibold text-gray-600">No cheques found</p>
              <p className="text-sm text-gray-500 mt-1">Add your first cheque or adjust filters</p>
              <button
                onClick={openNewChequeForm}
                className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add First Cheque
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Cheque #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[150px]">Company</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[140px]">Due Date</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[100px]">Type</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCheques.map((cheque) => {
                      const statusBadge = getStatusBadge(cheque.status);
                      const typeBadge = getTypeBadge(cheque.type);
                      const isOverdue = new Date(cheque.cheque_date) < new Date() && cheque.status === 'pending';
                      
                      return (
                        <tr key={cheque.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-mono font-bold text-gray-900 text-sm">{cheque.cheque_number}</p>
                            <p className="text-xs text-gray-500 mt-0.5">ID: #{cheque.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{cheque.company_name}</p>
                            {cheque.notes && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{cheque.notes}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className={`font-bold text-sm ${cheque.type === 'incoming' ? 'text-green-600' : 'text-purple-600'}`}>
                              {formatLKR(cheque.amount)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{formatDate(cheque.cheque_date)}</p>
                            {isOverdue && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 mt-1">
                                ⚠️ Overdue
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${typeBadge.class}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={cheque.status}
                              onChange={(e) => handleStatusChange(cheque, e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-full border ${statusBadge.class} cursor-pointer`}
                            >
                              <option value="pending">⏳ Pending</option>
                              <option value="cleared">✅ Cleared</option>
                              <option value="bounced">❌ Bounced</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditChequeForm(cheque)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit cheque"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCheque(cheque)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete cheque"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openViewDetailsModal(cheque)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="View cheque details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
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
        {viewingCheque && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingCheque(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">🧾 Cheque Details</h3>
                <button onClick={() => setViewingCheque(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <div className="space-y-4">
                {/* Cheque Number & ID */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Cheque Number</span>
                  <span className="text-sm font-mono font-bold text-gray-900">{viewingCheque.cheque_number}</span>
                </div>
                
                {/* Company */}
                <div className="py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 block mb-1">Company</span>
                  <p className="text-sm font-semibold text-gray-900">{viewingCheque.company_name}</p>
                </div>
                
                {/* Type & Status */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Type</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getTypeBadge(viewingCheque.type).class}`}>
                    {getTypeBadge(viewingCheque.type).label}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(viewingCheque.status).class}`}>
                    {getStatusBadge(viewingCheque.status).label}
                  </span>
                </div>
                
                {/* Amount */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Amount</span>
                  <span className={`text-lg font-black ${viewingCheque.type === 'incoming' ? 'text-green-600' : 'text-purple-600'}`}>
                    {formatLKR(viewingCheque.amount)}
                  </span>
                </div>
                
                {/* Dates */}
                <div className="py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 block mb-1">Cheque Date</span>
                  <p className="text-sm text-gray-900">{formatDate(viewingCheque.cheque_date)}</p>
                </div>
                
                <div className="py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 block mb-1">Remind Date</span>
                  <p className="text-sm text-gray-900">{formatDate(viewingCheque.remind_date)} (1 day before)</p>
                </div>
                
                {/* Notes */}
                {viewingCheque.notes && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500 block mb-1">Notes</span>
                    <p className="text-sm text-gray-700">{viewingCheque.notes}</p>
                  </div>
                )}
                
                {/* Created By */}
                {viewingCheque.created_by_name && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-500">Added By</span>
                    <span className="text-sm font-semibold text-gray-900">{viewingCheque.created_by_name}</span>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setViewingCheque(null);
                      openEditChequeForm(viewingCheque);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit This Cheque
                  </button>
                )}
                <button
                  onClick={() => setViewingCheque(null)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Cheque Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCheque ? '✏️ Edit Cheque' : '🧾 Add New Cheque'}
                </h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Company Name with Autocomplete */}
                <div className="relative" ref={companyInputRef}>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    onFocus={() => companySearch.length >= 2 && setShowCompanyDropdown(true)}
                    placeholder="Type or select existing company..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCompanies.map((company, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectCompany(company)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm transition-colors"
                        >
                          {company}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Start typing to see existing companies, or enter a new one
                  </p>
                </div>
                
                {/* Cheque Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Cheque Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cheque_number}
                    onChange={(e) => handleFormChange('cheque_number', e.target.value)}
                    placeholder="e.g., CHQ-2024-001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                
                {/* Amount & Type Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Amount (LKR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">LKR</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.amount}
                        onChange={(e) => handleFormChange('amount', e.target.value)}
                        className="w-full pl-14 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleFormChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="incoming">📥 Incoming</option>
                      <option value="outgoing">📤 Outgoing</option>
                    </select>
                  </div>
                </div>
                
                {/* Cheque Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Cheque Date (Due Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.cheque_date}
                    onChange={(e) => handleFormChange('cheque_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  {formData.cheque_date && (
                    <p className="text-xs text-indigo-600 mt-1">
                      🔔 Reminder will be set for: {formatDate(new Date(new Date(formData.cheque_date).setDate(new Date(formData.cheque_date).getDate() - 1)))}
                    </p>
                  )}
                </div>
                
                {/* Status */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="cleared">✅ Cleared</option>
                    <option value="bounced">❌ Bounced</option>
                  </select>
                </div>
                
                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    placeholder="Additional notes about this cheque..."
                  />
                </div>
                
                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Saving...
                      </>
                    ) : editingCheque ? '✅ Update Cheque' : '💾 Save Cheque'}
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
      </main>
    </div>
  );
};

export default Cheques;