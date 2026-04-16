import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import CustomerService from '../services/customer.service';
import { Toaster, toast } from 'react-hot-toast';

const CustomerList = () => {
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'name',
    order: 'ASC'
  });
  
  // New customer form
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
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
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Fetch credit customers on mount and when filters change
  useEffect(() => {
    fetchCreditCustomers();
  }, [filters]);

  // Fetch customer details when selected
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerDetails(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCreditCustomers = async () => {
    try {
      setLoading(true);
      const response = await CustomerService.getCreditCustomers(filters);
      if (response?.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else {
        if (response?.error) toast.error(response.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Fetch credit customers error:', error);
      toast.error('Network error loading customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      setLoadingDetails(true);
      const response = await CustomerService.getCustomerWithStats(customerId);
      if (response?.success && response.data) {
        setCustomerDetails(response.data);
      } else {
        toast.error(response?.error || 'Failed to load customer details');
        setCustomerDetails(null);
      }
    } catch (error) {
      console.error('Fetch customer details error:', error);
      toast.error('Network error loading customer details');
      setCustomerDetails(null);
    } finally {
      setLoadingDetails(false);
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

  // Format mobile for display
  const formatMobile = (mobile) => {
    if (!mobile) return 'N/A';
    // Format Sri Lankan mobile: 07XXXXXXXX → 07X XXX XXXX
    return mobile.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  // Get outstanding badge style
  const getOutstandingBadge = (amount) => {
    if (amount <= 0) return { label: '✓ Settled', class: 'bg-green-100 text-green-700 border-green-200' };
    if (amount < 5000) return { label: 'Low Due', class: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (amount < 20000) return { label: 'Medium Due', class: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { label: 'High Due', class: 'bg-red-100 text-red-700 border-red-200 animate-pulse' };
  };

  // Handle new customer form change
  const handleNewCustomerChange = (field, value) => {
    setNewCustomer(prev => ({ ...prev, [field]: value }));
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    // Validate required fields
    const name = newCustomer.name?.trim();
    const mobile = newCustomer.mobile?.trim();
    const address = newCustomer.address?.trim();
    const city = newCustomer.city?.trim();
    
    if (!name || !mobile || !address || !city) {
      toast.error('❌ Please fill all required fields (Name, Mobile, Address, City)');
      return;
    }
    
    // Validate mobile format
    if (!/^07[01245678]\d{7}$/.test(mobile)) {
      toast.error('❌ Invalid mobile format. Use: 07XXXXXXXX');
      return;
    }
    
    setCreatingCustomer(true);
    
    try {
      const response = await CustomerService.create({
        customer_type: newCustomer.customer_type,
        name,
        company_name: newCustomer.company_name?.trim() || null,
        mobile,
        email: newCustomer.email?.trim() || null,
        address,
        city,
        nic_id: newCustomer.nic_id?.trim() || null
      });
      
      if (response?.success && response.data) {
        toast.success('✅ Customer created successfully');
        setShowNewCustomerForm(false);
        setNewCustomer({
          customer_type: 'individual',
          name: '',
          company_name: '',
          mobile: '',
          email: '',
          address: '',
          city: '',
          nic_id: ''
        });
        // Refresh customer list
        fetchCreditCustomers();
      } else {
        toast.error(response?.error || '❌ Failed to create customer');
      }
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('❌ Network error creating customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Filter and sort customers (client-side for search)
  const filteredCustomers = useMemo(() => {
    let result = Array.isArray(customers) ? [...customers] : [];
    
    // Client-side search (in addition to backend filter)
    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(customer => 
        customer.name?.toLowerCase().includes(term) ||
        customer.company_name?.toLowerCase().includes(term) ||
        customer.mobile?.includes(term) ||
        customer.city?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [customers, filters.search]);

  // Stats summary
  const stats = useMemo(() => {
    const custs = Array.isArray(customers) ? customers : [];
    const totalOutstanding = custs.reduce((sum, c) => sum + (c.total_outstanding || 0), 0);
    const totalBills = custs.reduce((sum, c) => sum + (c.total_bills || 0), 0);
    const pendingBills = custs.reduce((sum, c) => sum + (c.pending_bills || 0), 0);
    return {
      total_customers: custs.length,
      total_outstanding: totalOutstanding,
      total_bills: totalBills,
      pending_bills: pendingBills
    };
  }, [customers]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl shadow-lg">
                👥
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Credit Customers</h1>
                <p className="text-sm text-gray-500">Manage customers with credit accounts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                ➕ New Customer
              </button>
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Customers */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-600 font-medium">Credit Customers</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {stats.total_customers}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Active credit accounts
              </p>
            </div>
            
            {/* Total Outstanding */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-xs text-red-600 font-medium">Total Outstanding</p>
              <p className="text-2xl font-black text-red-700 mt-1">
                {formatLKR(stats.total_outstanding)}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Amount due from customers
              </p>
            </div>
            
            {/* Total Bills */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Bills</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {stats.total_bills}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                All credit bills issued
              </p>
            </div>
            
            {/* Pending Bills */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-600 font-medium">Pending Bills</p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {stats.pending_bills}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Awaiting payment
              </p>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="🔍 Search by name, company, mobile, or city..."
                className="input-pos pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="input-pos w-48"
              >
                <option value="name">Sort by Name</option>
                <option value="company_name">Sort by Company</option>
                <option value="mobile">Sort by Mobile</option>
                <option value="total_outstanding">Sort by Due Amount</option>
                <option value="total_bills">Sort by Bill Count</option>
                <option value="pending_bills">Sort by Pending Bills</option>
                <option value="last_bill_date">Sort by Last Bill</option>
              </select>
              <button
                onClick={() => setFilters({...filters, order: filters.order === 'ASC' ? 'DESC' : 'ASC'})}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                title={`Sort ${filters.order === 'ASC' ? 'Ascending' : 'Descending'}`}
              >
                {filters.order === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
            
            {/* Refresh */}
            <button
              onClick={fetchCreditCustomers}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : '🔄'}
              Refresh
            </button>
          </div>
        </div>
        
        {/* Customers Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading credit customers...</p>
            </div>
          ) : !Array.isArray(filteredCustomers) || filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="text-6xl mb-4 opacity-30">👥</div>
              <p className="text-lg font-semibold">No credit customers found</p>
              <p className="text-sm mt-1">Customers with credit bills will appear here</p>
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                ➕ Add First Customer
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Bills</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer) => {
                    const outstandingBadge = getOutstandingBadge(customer.total_outstanding);
                    return (
                      <tr 
                        key={customer?.id || Math.random()} 
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name || 'N/A'}</p>
                            {customer.company_name && (
                              <p className="text-xs text-gray-600">{customer.company_name}</p>
                            )}
                            {customer.nic_id && (
                              <p className="text-xs text-gray-500 mt-1">NIC: {customer.nic_id}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm">📞 {formatMobile(customer.mobile)}</p>
                            {customer.email && (
                              <p className="text-xs text-gray-500">✉️ {customer.email}</p>
                            )}
                            <p className="text-xs text-gray-500">📍 {customer.city || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-bold text-gray-900">{customer.total_bills || 0}</p>
                          <p className="text-xs text-gray-500">
                            {customer.pending_bills || 0} pending • {customer.settled_bills || 0} settled
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className={`font-black text-lg ${customer.total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatLKR(customer.total_outstanding)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Billed: {formatLKR(customer.total_billed)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${outstandingBadge.class}`}>
                            {outstandingBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(customer);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View details"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Customer Details Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {customerDetails?.name || selectedCustomer.name}
                    {customerDetails?.company_name && <span className="text-gray-500 font-normal"> ({customerDetails.company_name})</span>}
                  </h3>
                  <p className="text-sm text-gray-500">Customer Details</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <p>Loading customer details...</p>
                  </div>
                ) : customerDetails ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Customer Info */}
                    <div className="lg:col-span-1 space-y-4">
                      {/* Profile Card */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {(customerDetails.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{customerDetails.name}</p>
                            {customerDetails.company_name && (
                              <p className="text-sm text-indigo-600">{customerDetails.company_name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>📞</span>
                            <span>{formatMobile(customerDetails.mobile)}</span>
                          </div>
                          {customerDetails.email && (
                            <div className="flex items-center gap-2">
                              <span>✉️</span>
                              <span>{customerDetails.email}</span>
                            </div>
                          )}
                          {customerDetails.nic_id && (
                            <div className="flex items-center gap-2">
                              <span>🆔</span>
                              <span>{customerDetails.nic_id}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{customerDetails.address}, {customerDetails.city}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Account Stats */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-3">Account Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Bills:</span>
                            <span className="font-bold">{customerDetails.stats?.total_bills || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pending:</span>
                            <span className="font-bold text-amber-600">{customerDetails.stats?.pending_bills || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Settled:</span>
                            <span className="font-bold text-green-600">{customerDetails.stats?.settled_bills || 0}</span>
                          </div>
                          <div className="border-t pt-3 mt-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Billed:</span>
                              <span className="font-bold">{formatLKR(customerDetails.stats?.total_billed)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Paid:</span>
                              <span className="font-bold text-green-600">{formatLKR(customerDetails.stats?.total_paid)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Outstanding & Bills */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Outstanding Summary */}
                      <div className={`p-4 rounded-xl border ${customerDetails.stats?.total_outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Total Outstanding Balance</p>
                            <p className={`text-3xl font-black ${customerDetails.stats?.total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatLKR(customerDetails.stats?.total_outstanding)}
                            </p>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${getOutstandingBadge(customerDetails.stats?.total_outstanding).class}`}>
                            {getOutstandingBadge(customerDetails.stats?.total_outstanding).label}
                          </span>
                        </div>
                      </div>
                      
                      {/* Recent Bills */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b bg-gray-50">
                          <h4 className="font-bold text-gray-900">Recent Bills</h4>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                          {customerDetails.recent_bills?.length > 0 ? (
                            customerDetails.recent_bills.map((bill) => {
                              const billStatus = bill.status_label || (bill.outstanding_amount <= 0 ? 'Paid' : 'Pending');
                              const statusClass = billStatus === 'Paid' ? 'bg-green-100 text-green-700' : billStatus === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                              
                              return (
                                <div key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-mono font-bold text-gray-900">{bill.bill_number}</p>
                                      <p className="text-xs text-gray-500">{formatDate(bill.created_at)}</p>
                                      {bill.notes && <p className="text-xs text-gray-600 mt-1">{bill.notes}</p>}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-gray-900">{formatLKR(bill.grand_total)}</p>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${statusClass}`}>
                                        {billStatus}
                                      </span>
                                      {bill.outstanding_amount > 0 && (
                                        <p className="text-xs text-red-600 mt-1">
                                          Due: {formatLKR(bill.outstanding_amount)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 text-center text-gray-400">
                              <p>No bills found for this customer</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p>Failed to load customer details</p>
                    <button
                      onClick={() => fetchCustomerDetails(selectedCustomer.id)}
                      className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                {/* <button
                  onClick={() => {
                    // TODO: Navigate to credit billing with this customer pre-selected
                    toast.success('🎯 Ready to create credit bill for this customer');
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                >
                  💳 Create Credit Bill
                </button> */}
              </div>
            </div>
          </div>
        )}
        
        {/* New Customer Modal */}
        {showNewCustomerForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCustomerForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Add New Customer</h3>
                  <p className="text-sm text-gray-500">Create a new credit customer account</p>
                </div>
                <button onClick={() => setShowNewCustomerForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Customer Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Customer Type</label>
                  <select
                    value={newCustomer.customer_type}
                    onChange={(e) => handleNewCustomerChange('customer_type', e.target.value)}
                    className="input-pos"
                  >
                    <option value="individual">👤 Individual</option>
                    <option value="company">🏢 Company</option>
                  </select>
                </div>
                
                {/* Name & Company */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => handleNewCustomerChange('name', e.target.value)}
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
                        onChange={(e) => handleNewCustomerChange('company_name', e.target.value)}
                        className="input-pos"
                        placeholder="Company name"
                      />
                    </div>
                  )}
                </div>
                
                {/* Mobile & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.mobile}
                      onChange={(e) => handleNewCustomerChange('mobile', e.target.value)}
                      className="input-pos"
                      placeholder="07XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => handleNewCustomerChange('email', e.target.value)}
                      className="input-pos"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                
                {/* Address & City */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newCustomer.address}
                      onChange={(e) => handleNewCustomerChange('address', e.target.value)}
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
                      onChange={(e) => handleNewCustomerChange('city', e.target.value)}
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
                      onChange={(e) => handleNewCustomerChange('nic_id', e.target.value)}
                      className="input-pos"
                      placeholder="National ID number"
                    />
                  </div>
                </div>
                
                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    💡 This customer will be available for credit billing. Outstanding balance starts at LKR 0.00.
                  </p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={creatingCustomer}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
                >
                  {creatingCustomer ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Creating...
                    </>
                  ) : '✅ Create Customer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerList;