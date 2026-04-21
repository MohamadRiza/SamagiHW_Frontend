import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ExpenseService from '../services/expense.service';
import ExpenseCategoryService from '../services/expenseCategory.service';
import { Toaster, toast } from 'react-hot-toast';

const Expenses = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalToday, setTotalToday] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    categoryId: '',
    sortBy: 'expense_date',
    order: 'DESC'
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    amount: '',
    category_id: '',
    expense_date: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // ✅ NEW: View details modal state
  const [viewingExpense, setViewingExpense] = useState(null);
  
  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3b82f6' });

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchCategories();
    fetchExpenses();
    fetchTotals();
  }, [filters]);
  
  // Set today's date as default for date filters
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters(prev => ({
      ...prev,
      dateFrom: prev.dateFrom || today,
      dateTo: prev.dateTo || today
    }));
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await ExpenseCategoryService.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await ExpenseService.getAll(filters);
      if (response?.success && Array.isArray(response.data)) {
        setExpenses(response.data);
      } else {
        if (response?.error) toast.error(response.error);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Fetch expenses error:', error);
      toast.error('Network error loading expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotals = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const todayResponse = await ExpenseService.getTotal({ dateFrom: today, dateTo: today });
      if (todayResponse?.success) {
        setTotalToday(todayResponse.data.total);
      }
      
      const filteredResponse = await ExpenseService.getTotal(filters);
      if (filteredResponse?.success) {
        setTotalFiltered(filteredResponse.data.total);
      }
    } catch (error) {
      console.error('Fetch totals error:', error);
    }
  };

  // Format currency
  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
  };

  // Format datetime for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // Format date for input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (dateString) => {
    if (!dateString) return new Date().toISOString().slice(0, 16);
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      reason: '',
      amount: '',
      category_id: categories[0]?.id || '',
      expense_date: ''
    });
    setEditingExpense(null);
  };

  // Open form for new expense
  const openNewExpenseForm = () => {
    resetForm();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    setFormData(prev => ({ ...prev, expense_date: currentTime }));
    setShowForm(true);
  };

  // Open form for editing expense
  const openEditExpenseForm = (expense) => {
    setFormData({
      reason: expense.reason,
      amount: expense.amount.toString(),
      category_id: expense.category_id,
      expense_date: formatDateForInput(expense.expense_date)
    });
    setEditingExpense(expense);
    setShowForm(true);
  };

  // ✅ NEW: Open view details modal
  const openViewDetailsModal = (expense) => {
    setViewingExpense(expense);
  };

  // Handle form submit (create/update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason.trim() || formData.reason.trim().length < 3) {
      toast.error('Reason must be at least 3 characters');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }
    
    setFormLoading(true);
    
    try {
      let expenseDate;
      if (formData.expense_date) {
        expenseDate = new Date(formData.expense_date).toISOString();
      } else {
        expenseDate = new Date().toISOString();
      }
      
      const expenseData = {
        reason: formData.reason.trim(),
        amount,
        category_id: parseInt(formData.category_id),
        expense_date: expenseDate
      };
      
      let response;
      if (editingExpense) {
        response = await ExpenseService.update(editingExpense.id, expenseData);
        if (response?.success) {
          toast.success('✅ Expense updated successfully');
        }
      } else {
        response = await ExpenseService.create(expenseData);
        if (response?.success) {
          toast.success('✅ Expense added successfully');
        }
      }
      
      if (response?.success) {
        setShowForm(false);
        resetForm();
        fetchExpenses();
        fetchTotals();
      } else {
        toast.error(response?.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Submit expense error:', error);
      toast.error('Network error saving expense');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete expense (admin only)
  const handleDeleteExpense = async (expense) => {
    if (!isAdmin) {
      toast.error('Only admins can delete expenses');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this expense?\n\nReason: ${expense.reason}\nAmount: ${formatLKR(expense.amount)}`)) {
      return;
    }
    
    try {
      const response = await ExpenseService.delete(expense.id);
      if (response?.success) {
        toast.success('✅ Expense deleted');
        fetchExpenses();
        fetchTotals();
      } else {
        toast.error(response?.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Delete expense error:', error);
      toast.error('Network error deleting expense');
    }
  };

  // Handle create new category
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim() || newCategory.name.trim().length < 2) {
      toast.error('Category name must be at least 2 characters');
      return;
    }
    
    try {
      const response = await ExpenseCategoryService.create(
        newCategory.name.trim(),
        newCategory.description?.trim() || null,
        newCategory.color
      );
      
      if (response?.success && response.data) {
        toast.success('✅ Category created');
        setCategories(prev => [...prev, response.data]);
        setNewCategory({ name: '', description: '', color: '#3b82f6' });
        setShowCategoryModal(false);
        if (showForm) {
          setFormData(prev => ({ ...prev, category_id: response.data.id }));
        }
      } else {
        toast.error(response?.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      toast.error('Network error creating category');
    }
  };

  // Filter expenses client-side
  const filteredExpenses = useMemo(() => {
    let result = Array.isArray(expenses) ? [...expenses] : [];
    
    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(expense => 
        expense.reason?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [expenses, filters.search]);

  // Stats for display
  const stats = useMemo(() => {
    return {
      today: totalToday,
      filtered: totalFiltered,
      count: filteredExpenses.length
    };
  }, [totalToday, totalFiltered, filteredExpenses]);

  // Get category color badge style
  const getCategoryBadge = (category) => {
    if (!category) return { label: 'Unknown', style: { backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' } };
    return { 
      label: category.name, 
      style: { 
        backgroundColor: `${category.color}15`, 
        color: category.color,
        borderColor: `${category.color}40`
      }
    };
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-rose-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage business expenses</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={openNewExpenseForm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Total */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200">
              <p className="text-xs text-rose-600 font-medium">Today's Expenses</p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {formatLKR(stats.today)}
              </p>
              <p className="text-xs text-rose-600 mt-1">
                {new Date().toLocaleDateString('en-LK', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
            
            {/* Filtered Total */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Filtered Total</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {formatLKR(stats.filtered)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {filters.dateFrom === filters.dateTo 
                  ? formatDateForInput(filters.dateFrom).split('T')[0]
                  : `${formatDateForInput(filters.dateFrom).split('T')[0]} → ${formatDateForInput(filters.dateTo).split('T')[0]}`
                }
              </p>
            </div>
            
            {/* Expense Count */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Expenses Listed</p>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {stats.count}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                In current view
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-600 font-medium">Quick Actions</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setFilters({ ...filters, dateFrom: new Date().toISOString().slice(0, 10), dateTo: new Date().toISOString().slice(0, 10) })}
                  className="text-xs px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg transition-colors font-medium"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    setFilters({
                      ...filters,
                      dateFrom: start.toISOString().slice(0, 10),
                      dateTo: end.toISOString().slice(0, 10)
                    });
                  }}
                  className="text-xs px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-lg transition-colors font-medium"
                >
                  Last 7 Days
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search by reason..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Date Range */}
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent min-w-[150px]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            {/* Sort */}
            <div className="flex gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="expense_date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="category_name">Category</option>
                  <option value="reason">Reason</option>
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
            
            {/* Refresh */}
            <button
              onClick={() => { fetchExpenses(); fetchTotals(); }}
              disabled={loading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
        
        {/* Expenses Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="animate-spin h-8 w-8 text-rose-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p>Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 3.666V14m-6.118 4.134l.522-.87a2 2 0 013.192 0l.522.87a2 2 0 003.464 0l.522-.87a2 2 0 013.192 0l.522.87M5.25 12.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25v5.25a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25V12.5z" />
              </svg>
              <p className="text-lg font-semibold text-gray-600">No expenses found</p>
              <p className="text-sm text-gray-500 mt-1">Add your first expense or adjust filters</p>
              <button
                onClick={openNewExpenseForm}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExpenses.map((expense) => {
                      const category = categories.find(c => c.id === expense.category_id);
                      const categoryBadge = getCategoryBadge(category);
                      
                      return (
                        <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{expense.id}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{expense.reason}</p>
                            {expense.created_by_name && (
                              <p className="text-xs text-gray-500 mt-0.5">By: {expense.created_by_name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span 
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                              style={categoryBadge.style}
                            >
                              {categoryBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-bold text-rose-600 text-sm">{formatLKR(expense.amount)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{formatDate(expense.expense_date)}</p>
                            <p className="text-xs text-gray-500">{new Date(expense.expense_date).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditExpenseForm(expense)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit expense"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete expense"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {/* ✅ FIXED: View Details Button */}
                              <button
                                onClick={() => openViewDetailsModal(expense)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="View expense details"
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
        
        {/* ✅ NEW: View Details Modal */}
        {viewingExpense && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingExpense(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">📋 Expense Details</h3>
                <button onClick={() => setViewingExpense(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <div className="space-y-4">
                {/* ID */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Expense ID</span>
                  <span className="text-sm font-mono font-bold text-gray-900">#{viewingExpense.id}</span>
                </div>
                
                {/* Reason */}
                <div className="py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 block mb-1">Reason</span>
                  <p className="text-sm font-semibold text-gray-900">{viewingExpense.reason}</p>
                </div>
                
                {/* Category */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Category</span>
                  {(() => {
                    const cat = categories.find(c => c.id === viewingExpense.category_id);
                    const badge = getCategoryBadge(cat);
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border" style={badge.style}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                
                {/* Amount */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Amount</span>
                  <span className="text-lg font-black text-rose-600">{formatLKR(viewingExpense.amount)}</span>
                </div>
                
                {/* Date & Time */}
                <div className="py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500 block mb-1">Date & Time</span>
                  <p className="text-sm text-gray-900">{formatDateTime(viewingExpense.expense_date)}</p>
                </div>
                
                {/* Created By */}
                {viewingExpense.created_by_name && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Added By</span>
                    <span className="text-sm font-semibold text-gray-900">{viewingExpense.created_by_name}</span>
                  </div>
                )}
                
                {/* Last Updated */}
                {viewingExpense.updated_at && (
                  <div className="py-2">
                    <span className="text-sm font-medium text-gray-500 block mb-1">Last Updated</span>
                    <p className="text-sm text-gray-900">{formatDateTime(viewingExpense.updated_at)}</p>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setViewingExpense(null);
                      openEditExpenseForm(viewingExpense);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit This Expense
                  </button>
                )}
                <button
                  onClick={() => setViewingExpense(null)}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Expense Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingExpense ? '✏️ Edit Expense' : '➕ Add New Expense'}
                </h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reason */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    rows={2}
                    placeholder="Why was this expense incurred? (e.g., Office electricity bill)"
                    required
                  />
                </div>
                
                {/* Amount */}
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
                      className="w-full pl-14 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent font-bold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.category_id}
                      onChange={(e) => handleFormChange('category_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                      title="Add new category"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Date & Time <span className="text-gray-400 font-normal">(Auto-filled)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expense_date}
                    onChange={(e) => handleFormChange('expense_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults to current time. Click to adjust if needed.
                  </p>
                </div>
                
                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Saving...
                      </>
                    ) : editingExpense ? '✅ Update Expense' : '💾 Save Expense'}
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
        
        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">➕ Add New Category</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              
              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Marketing, Maintenance"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={2}
                    placeholder="Brief description of this expense category"
                  />
                </div>
                
                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Color (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      Used for visual identification in reports
                    </span>
                  </div>
                </div>
                
                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateCategory}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Category
                  </button>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Expenses;