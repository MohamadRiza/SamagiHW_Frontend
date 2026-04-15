import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import CreditBillService from '../services/creditBill.service';
import CustomerService from '../services/customer.service';
import { Toaster, toast } from 'react-hot-toast';

const PendingBills = () => {
  const { user } = useAuth();
  
  // State
  const [pendingBills, setPendingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // 'all', 'pending', 'partial'
    sortBy: 'due_date',
    order: 'ASC'
  });
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Fetch pending bills
  useEffect(() => {
    fetchPendingBills();
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

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      const response = await CreditBillService.getPending(filters);
      if (response?.success && Array.isArray(response.data)) {
        setPendingBills(response.data);
      } else {
        if (response?.error) toast.error(response.error);
        setPendingBills([]);
      }
    } catch (error) {
      console.error('Fetch pending bills error:', error);
      toast.error('Network error loading bills');
      setPendingBills([]);
    } finally {
      setLoading(false);
    }
  };

  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const isOverdue = (bill) => {
    if (!bill?.due_date || bill.status === 'paid') return false;
    return new Date(bill.due_date) < new Date();
  };

  const getStatusBadge = (status, overdue) => {
    if (status === 'paid') return 'bg-green-100 text-green-700 border-green-200';
    if (overdue) return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const openPaymentModal = (bill) => {
    if (!bill) return;
    setSelectedBill(bill);
    setPaymentAmount((bill.outstanding_amount || 0).toFixed(2));
    setPaymentMethod('CASH');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedBill) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (amount > (selectedBill.outstanding_amount || 0) + 0.01) {
      toast.error(`Payment cannot exceed outstanding: ${formatLKR(selectedBill.outstanding_amount)}`);
      return;
    }
    
    setProcessing(selectedBill.id);
    
    try {
      const response = await CreditBillService.updatePayment(selectedBill.id, {
        paid_amount: amount,
        payment_method: paymentMethod,
        notes: paymentNotes
      });
      
      if (response?.success) {
        const isFullyPaid = response.data?.payment_result?.newStatus === 'paid';
        toast.success(isFullyPaid 
          ? `✅ Bill #${selectedBill.bill_number} marked as PAID!` 
          : `✅ Payment of ${formatLKR(amount)} recorded`);
        
        fetchPendingBills();
        setShowPaymentModal(false);
        
        if (isFullyPaid) {
          setTimeout(() => {
            if (window.confirm('🖨️ Print payment receipt?')) {
              printPaymentReceipt(selectedBill, amount, paymentMethod);
            }
          }, 500);
        }
      } else {
        toast.error(response?.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Network error processing payment');
    } finally {
      setProcessing(null);
    }
  };

  const printPaymentReceipt = (bill, amount, method) => {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    const outstandingAfter = (bill.outstanding_amount || 0) - amount;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Payment Receipt - ${bill.bill_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10px; padding: 8px; background: #fff; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 14px; }
        .receipt-info { font-size: 9px; margin-bottom: 8px; }
        .receipt-info div { margin: 2px 0; }
        .payment-details { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin: 8px 0; }
        .payment-details div { display: flex; justify-content: space-between; margin: 3px 0; }
        .total { font-weight: bold; font-size: 12px; }
        .footer { text-align: center; font-size: 8px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px; }
        .paid-stamp { background: #22c55e; color: white; padding: 4px 8px; font-weight: bold; font-size: 10px; border-radius: 3px; display: inline-block; margin: 4px 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
        <div class="header"><h2>SAMAGI HARDWARE</h2><p>PAYMENT RECEIPT</p><p>${new Date().toLocaleString('en-LK')}</p></div>
        <div class="receipt-info">
          <div><strong>Bill #:</strong> ${bill.bill_number || 'N/A'}</div>
          <div><strong>Customer:</strong> ${bill.customer_name || 'N/A'}${bill.company_name ? ` (${bill.company_name})` : ''}</div>
          <div><strong>Mobile:</strong> ${bill.mobile || 'N/A'}</div>
          <div><strong>Original Amount:</strong> ${formatLKR(bill.grand_total)}</div>
          <div><strong>Previous Paid:</strong> ${formatLKR(bill.paid_amount || 0)}</div>
        </div>
        <div class="payment-details">
          <div><span>Payment Amount:</span><span>${formatLKR(amount)}</span></div>
          <div><span>Payment Method:</span><span>${method}</span></div>
          <div><span>Payment Date:</span><span>${new Date().toLocaleDateString('en-LK')}</span></div>
          ${paymentNotes ? `<div><span>Notes:</span><span>${paymentNotes}</span></div>` : ''}
        </div>
        <div class="payment-details">
          <div class="total"><span>NEW OUTSTANDING:</span><span>${formatLKR(outstandingAfter)}</span></div>
        </div>
        ${outstandingAfter <= 0 ? '<div class="paid-stamp">✓ FULLY PAID</div>' : ''}
        <div class="footer"><p>Thank you for your payment!</p><p>Cashier: ${user?.username || 'N/A'}</p><p>Receipt ID: PAY-${Date.now().toString().slice(-6)}</p></div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleReprintBill = async (bill) => {
    if (!bill?.id) return;
    try {
      const response = await CreditBillService.reprintBill(bill.id);
      if (response?.success && response.data) {
        openOriginalBillPrint(response.data);
      } else {
        toast.error(response?.error || 'Failed to fetch bill');
      }
    } catch (error) {
      toast.error('Network error reprinting bill');
    }
  };

  const openOriginalBillPrint = (bill) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Credit Bill - ${bill.bill_number}</title>
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
        .status-badge { background: ${bill.status === 'paid' ? '#22c55e' : bill.status === 'partial' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 2px 6px; font-size: 8px; border-radius: 2px; }
        .footer { text-align: center; font-size: 8px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
        <div class="header"><h2>SAMAGI HARDWARE</h2><p>CREDIT BILL <span class="status-badge">${(bill.status || 'pending').toUpperCase()}</span></p><p>${new Date(bill.created_at).toLocaleString('en-LK')}</p></div>
        <div class="customer-info">
          <div><strong>Bill #:</strong> ${bill.bill_number || 'N/A'}</div>
          <div><strong>Customer:</strong> ${bill.customer_name || 'N/A'}${bill.company_name ? ` (${bill.company_name})` : ''}</div>
          <div><strong>Mobile:</strong> ${bill.mobile || 'N/A'}</div>
          <div><strong>Address:</strong> ${bill.address || 'N/A'}, ${bill.city || 'N/A'}</div>
          <div><strong>Due Date:</strong> ${bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-LK') : 'N/A'}</div>
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
          <div><span>Paid:</span><span>${formatLKR(bill.paid_amount || 0)}</span></div>
          <div><span>Outstanding:</span><span>${formatLKR(bill.outstanding_amount || 0)}</span></div>
        </div>
        <div class="footer"><p>Thank you for your business!</p><p>Please settle outstanding by due date</p><p>Cashier: ${bill.cashier_name || 'N/A'}</p></div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const filteredBills = useMemo(() => {
    let result = Array.isArray(pendingBills) ? [...pendingBills] : [];
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
  }, [pendingBills, filters.search]);

  const stats = useMemo(() => {
    const bills = Array.isArray(pendingBills) ? pendingBills : [];
    const total = bills.reduce((sum, b) => sum + (b.outstanding_amount || 0), 0);
    const overdue = bills.filter(b => isOverdue(b)).length;
    const partial = bills.filter(b => b.status === 'partial').length;
    return { total, overdue, partial, count: bills.length };
  }, [pendingBills]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-amber-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl shadow-lg">📋</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pending Bills</h1>
                <p className="text-sm text-gray-500">Manage unpaid credit bills & payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-amber-100 border border-amber-200 rounded-xl">
                <span className="text-sm font-bold text-amber-700">{stats.count} Pending</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Stats Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">Total Outstanding:</span>
              <span className="font-bold text-gray-900">{formatLKR(stats.total)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-gray-600">Overdue:</span>
              <span className="font-bold text-red-600">{stats.overdue} bills</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600">Partial Payments:</span>
              <span className="font-bold text-amber-600">{stats.partial} bills</span>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="🔍 Search by customer name, mobile, company, address, or bill #..."
                className="input-pos pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="input-pos w-40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Only</option>
              <option value="partial">Partial Payments</option>
            </select>
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="input-pos w-40"
              >
                <option value="due_date">Sort by Due Date</option>
                <option value="created_at">Sort by Date</option>
                <option value="outstanding_amount">Sort by Amount</option>
                <option value="customer_name">Sort by Customer</option>
              </select>
              <button
                onClick={() => setFilters({...filters, order: filters.order === 'ASC' ? 'DESC' : 'ASC'})}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                title={`Sort ${filters.order === 'ASC' ? 'Ascending' : 'Descending'}`}
              >
                {filters.order === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
            <button
              onClick={fetchPendingBills}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
        
        {/* Bills Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-amber-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading pending bills...</p>
            </div>
          ) : !Array.isArray(filteredBills) || filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-lg font-semibold">No pending bills found</p>
              <p className="text-sm mt-1">All credit bills are paid or adjust filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Bill #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date / Due</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBills.map((bill) => {
                    const overdue = isOverdue(bill);
                    return (
                      <tr key={bill?.id || Math.random()} className={`hover:bg-amber-50/50 transition-colors ${overdue ? 'bg-red-50/30' : ''}`}>
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
                            <p className="text-sm">Due: {formatDate(bill.due_date)}</p>
                            {overdue && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 mt-1">⚠️ Overdue</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-bold text-gray-900">{formatLKR(bill.grand_total)}</p>
                          <p className="text-xs text-gray-500">Paid: {formatLKR(bill.paid_amount || 0)}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className={`font-black text-lg ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                            {formatLKR(bill.outstanding_amount)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(bill.status, overdue)}`}>
                            {bill.status === 'paid' ? '✓ Paid' : bill.status === 'partial' ? '◐ Partial' : '○ Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openPaymentModal(bill)}
                              disabled={processing === bill?.id || bill.status === 'paid'}
                              className={`p-2 rounded-lg transition-all ${
                                bill.status === 'paid'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105'
                              }`}
                              title={bill.status === 'paid' ? 'Already paid' : 'Record payment'}
                            >💰</button>
                            <button
                              onClick={() => handleReprintBill(bill)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Reprint original bill"
                            >🧾</button>
                            <button
                              onClick={() => {}}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                              title="View bill details"
                            >👁️</button>
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
        
        {/* Payment Modal */}
        {showPaymentModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="font-mono font-bold text-gray-900">#{selectedBill.bill_number || 'N/A'}</p>
                <p className="text-sm text-gray-600">{selectedBill.customer_name || 'N/A'}{selectedBill.company_name ? ` (${selectedBill.company_name})` : ''}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span>Original Amount:</span>
                  <span className="font-bold">{formatLKR(selectedBill.grand_total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Previously Paid:</span>
                  <span className="font-bold">{formatLKR(selectedBill.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t font-bold">
                  <span>Outstanding:</span>
                  <span className={isOverdue(selectedBill) ? 'text-red-600' : 'text-amber-600'}>
                    {formatLKR(selectedBill.outstanding_amount)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Payment Amount <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">LKR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedBill.outstanding_amount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="input-pos pl-14 font-bold text-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount((selectedBill.outstanding_amount || 0).toFixed(2))}
                      className="text-xs px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                    >Pay Full Amount</button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(((selectedBill.outstanding_amount || 0) * 0.5).toFixed(2))}
                      className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >Pay 50%</button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input-pos"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="CARD">💳 Card</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                    <option value="CHEQUE">🧾 Cheque</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="input-pos"
                    rows={2}
                    placeholder="Payment reference, cheque number, etc."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={handleProcessPayment}
                  disabled={processing === selectedBill?.id || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing === selectedBill?.id ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Processing...</>
                  ) : '✅ Record Payment'}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                >Cancel</button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">💡 Paying the full outstanding amount will mark this bill as <strong>PAID</strong></p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PendingBills;