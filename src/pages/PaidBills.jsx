import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import CreditBillService from '../services/creditBill.service';
import CustomerService from '../services/customer.service';
import { Toaster, toast } from 'react-hot-toast';

const PaidBills = () => {
  const { user } = useAuth();
  
  // State
  const [paidBills, setPaidBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    order: 'DESC'
  });
  
  // Customer search for filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Fetch paid bills on mount and when filters change
  useEffect(() => {
    fetchPaidBills();
  }, [filters]);

  // Debounced customer search
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const response = await CustomerService.search(customerSearch);
        if (response?.success && Array.isArray(response.data)) {
          setCustomerSuggestions(response.data);
          setShowCustomerDropdown(true);
        }
      } catch (error) {
        console.error('Customer search error:', error);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const fetchPaidBills = async () => {
    try {
      setLoading(true);
      const response = await CreditBillService.getPaid(filters);
      if (response?.success && Array.isArray(response.data)) {
        setPaidBills(response.data);
        setStats(response.stats);
      } else {
        if (response?.error) toast.error(response.error);
        setPaidBills([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Fetch paid bills error:', error);
      toast.error('Network error loading paid bills');
      setPaidBills([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 10);
  };

  // Get payment method badge style
  const getPaymentBadge = (bill) => {
    // Try to infer payment method from notes or default to CREDIT
    const notes = bill.notes?.toLowerCase() || '';
    if (notes.includes('cash')) return { label: '💵 Cash', class: 'bg-green-100 text-green-700' };
    if (notes.includes('card')) return { label: '💳 Card', class: 'bg-blue-100 text-blue-700' };
    if (notes.includes('bank') || notes.includes('transfer')) return { label: '🏦 Transfer', class: 'bg-purple-100 text-purple-700' };
    if (notes.includes('cheque')) return { label: '🧾 Cheque', class: 'bg-amber-100 text-amber-700' };
    return { label: '✓ Paid', class: 'bg-emerald-100 text-emerald-700' };
  };

  // Reprint paid bill receipt
  const handleReprintBill = async (bill) => {
    try {
      const response = await CreditBillService.reprintBill(bill.id);
      if (response?.success && response.data) {
        openPaidBillPrint(response.data);
      } else {
        toast.error(response?.error || 'Failed to fetch bill');
      }
    } catch (error) {
      toast.error('Network error reprinting bill');
    }
  };

  // Print paid bill receipt
  const openPaidBillPrint = (bill) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    const paymentBadge = getPaymentBadge(bill);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Paid Bill - ${bill.bill_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10px; padding: 8px; background: #fff; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 14px; }
        .customer-info { font-size: 9px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 9px; }
        td { padding: 3px 0; font-size: 9px; }
        .totals { border-top: 2px dashed #000; padding-top: 6px; }
        .totals div { display: flex; justify-content: space-between; margin: 3px 0; }
        .grand-total { font-weight: bold; font-size: 12px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
        .paid-badge { background: #22c55e; color: white; padding: 2px 8px; font-size: 9px; border-radius: 3px; font-weight: bold; }
        .footer { text-align: center; font-size: 8px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
        <div class="header"><h2>SAMAGI HARDWARE</h2><p>PAID BILL <span class="paid-badge">✓ SETTLED</span></p><p>${new Date(bill.created_at).toLocaleString('en-LK')}</p></div>
        <div class="customer-info">
          <div><strong>Bill #:</strong> ${bill.bill_number || 'N/A'}</div>
          <div><strong>Customer:</strong> ${bill.customer_name || 'N/A'}${bill.company_name ? ` (${bill.company_name})` : ''}</div>
          <div><strong>Mobile:</strong> ${bill.mobile || 'N/A'}</div>
          <div><strong>Address:</strong> ${bill.address || 'N/A'}, ${bill.city || 'N/A'}</div>
          <div><strong>Bill Date:</strong> ${formatDate(bill.created_at)}</div>
          <div><strong>Payment Date:</strong> ${bill.paid_at ? formatDate(bill.paid_at) : 'N/A'}</div>
        </div>
        <table><thead><tr><th style="width:45%">Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>
          ${Array.isArray(bill.items) ? bill.items.map(item => `
            <tr><td>${item.product_name || 'N/A'}<br><span style="font-size:8px;color:#666">${item.barcode || ''}</span></td>
            <td style="text-align:center">${item.quantity || 1}</td>
            <td style="text-align:right">${((item.unit_price || 0)).toFixed(2)}</td>
            <td style="text-align:right;font-weight:bold">${(((item.unit_price || 0) * (item.quantity || 1)) - ((item.discount_lkr || 0) * (item.quantity || 1))).toFixed(2)}</td></tr>
          `).join('') : ''}
        </tbody></table>
        <div class="totals">
          <div><span>Subtotal:</span><span>${formatLKR(bill.total_amount || 0)}</span></div>
          <div style="color:red"><span>Discount:</span><span>- ${formatLKR(bill.total_discount || 0)}</span></div>
          <div class="grand-total"><span>TOTAL:</span><span>${formatLKR(bill.grand_total || 0)}</span></div>
          <div><span>Paid:</span><span>${formatLKR(bill.paid_amount || bill.grand_total || 0)}</span></div>
          <div><span>Outstanding:</span><span>${formatLKR(bill.outstanding_amount || 0)}</span></div>
          <div style="margin-top:4px"><span>Payment:</span><span class="${paymentBadge.class}">${paymentBadge.label}</span></div>
        </div>
        <div class="footer"><p>✓ Payment Received - Thank You!</p><p>Cashier: ${bill.cashier_name || 'N/A'}</p><p>Printed: ${new Date().toLocaleString('en-LK')}</p></div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Filter and sort bills (client-side for search)
  const filteredBills = useMemo(() => {
    let result = Array.isArray(paidBills) ? [...paidBills] : [];
    
    // Client-side search (in addition to backend filter)
    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(bill => 
        bill.customer_name?.toLowerCase().includes(term) ||
        bill.company_name?.toLowerCase().includes(term) ||
        bill.mobile?.includes(term) ||
        bill.address?.toLowerCase().includes(term) ||
        bill.city?.toLowerCase().includes(term) ||
        bill.bill_number?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [paidBills, filters.search]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xl shadow-lg">
                ✅
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Paid Bills</h1>
                <p className="text-sm text-gray-500">View settled bills & earnings reports</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-xl">
                <span className="text-sm font-bold text-emerald-700">
                  {stats?.total_bills || 0} Paid
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Bills */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Total Paid Bills</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {stats?.total_bills || 0}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {stats?.unique_customers || 0} unique customers
              </p>
            </div>
            
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {formatLKR(stats?.total_revenue)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Avg: {formatLKR(stats?.avg_bill_value)} / bill
              </p>
            </div>
            
            {/* Total Paid */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium">Total Collected</p>
              <p className="text-2xl font-black text-green-700 mt-1">
                {formatLKR(stats?.total_paid)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                100% of billed amount
              </p>
            </div>
            
            {/* Date Range */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Period</p>
              <p className="text-sm font-bold text-purple-700 mt-1">
                {filters.dateFrom ? formatDateForInput(filters.dateFrom) : 'Start'}
                <span className="mx-1">→</span>
                {filters.dateTo ? formatDateForInput(filters.dateTo) : 'Now'}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Filter by bill date
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
                placeholder="🔍 Search by customer name, mobile, company, or bill #..."
                className="input-pos pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Date Range */}
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="input-pos w-40"
                title="From Date"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="input-pos w-40"
                title="To Date"
              />
            </div>
            
            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="input-pos w-40"
              >
                <option value="created_at">Sort by Date</option>
                <option value="grand_total">Sort by Amount</option>
                <option value="customer_name">Sort by Customer</option>
                <option value="bill_number">Sort by Bill #</option>
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
              onClick={fetchPaidBills}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
          
          {/* Active Filters Display */}
          {(filters.search || filters.dateFrom || filters.dateTo) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  🔍 "{filters.search}"
                  <button onClick={() => setFilters({...filters, search: ''})} className="hover:text-blue-900">×</button>
                </span>
              )}
              {filters.dateFrom && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  📅 From: {formatDateForInput(filters.dateFrom)}
                  <button onClick={() => setFilters({...filters, dateFrom: ''})} className="hover:text-purple-900">×</button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  📅 To: {formatDateForInput(filters.dateTo)}
                  <button onClick={() => setFilters({...filters, dateTo: ''})} className="hover:text-purple-900">×</button>
                </span>
              )}
              <button
                onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', sortBy: 'created_at', order: 'DESC' })}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
        
        {/* Bills Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-emerald-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading paid bills...</p>
            </div>
          ) : !Array.isArray(filteredBills) || filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="text-6xl mb-4 opacity-30">✅</div>
              <p className="text-lg font-semibold">No paid bills found</p>
              <p className="text-sm mt-1">Adjust filters or check back later</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Bill #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Bill / Paid Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBills.map((bill) => {
                    const paymentBadge = getPaymentBadge(bill);
                    return (
                      <tr key={bill?.id || Math.random()} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-mono font-bold text-gray-900">{bill.bill_number || 'N/A'}</p>
                            <p className="text-xs text-gray-500">Created: {formatDate(bill.created_at)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{bill.customer_name || 'N/A'}</p>
                            {bill.company_name && <p className="text-xs text-gray-600">{bill.company_name}</p>}
                            <p className="text-xs text-gray-500">📞 {bill.mobile || 'N/A'}</p>
                            <p className="text-xs text-gray-500">📍 {bill.city || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm">Bill: {formatDate(bill.created_at)}</p>
                            <p className="text-sm text-emerald-600 font-medium">Paid: {bill.paid_at ? formatDate(bill.paid_at) : 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-bold text-gray-900">{formatLKR(bill.grand_total)}</p>
                          <p className="text-xs text-gray-500">Paid: {formatLKR(bill.paid_amount || bill.grand_total)}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${paymentBadge.class} border-transparent`}>
                            {paymentBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleReprintBill(bill)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Reprint paid bill"
                            >
                              🧾
                            </button>
                            <button
                              onClick={() => {}}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                              title="View bill details"
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
          )}
        </div>
      </main>
    </div>
  );
};

export default PaidBills;