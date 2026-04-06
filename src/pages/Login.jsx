import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast'; // Optional: for better UX

const Login = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      await login(data.username, data.password);
      
      // ✅ Success: redirect to intended page
      navigate(from, { replace: true });
      
    } catch (err) {
      // ✅ Handle login errors properly
      const errorMessage = err?.response?.data?.error || 
                          err?.message || 
                          'Login failed. Please check your credentials.';
      
      setError(errorMessage);
      
      // Optional: Show toast notification for better UX
      if (typeof toast !== 'undefined') {
        toast.error(errorMessage);
      }
      
      // ❌ Don't reset form on error - let user correct credentials
      // reset(); // ← Commented out intentionally
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Optional: Global Toaster */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px' },
        }}
      />
      
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">POS System</h2>
          <p className="mt-2 text-center text-gray-600">Sign in to continue</p>
        </div>
        
        {/* Persistent Error Message */}
        {error && (
          <div 
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
            role="alert"
          >
            <span className="font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              {...register('username', { 
                required: 'Username is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters'
                }
              })}
              className="input-field mt-1"
              placeholder="Enter username"
              autoComplete="username"
              disabled={loading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className="input-field mt-1"
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex justify-center py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
        
        {/* Demo Credentials Hint (Remove in Production) */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t">
          <p>Demo: <code className="bg-gray-100 px-1 rounded">admin</code> / <code className="bg-gray-100 px-1 rounded">admin123</code></p>
        </div>
      </div>
    </div>
  );
};

export default Login;