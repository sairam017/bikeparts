import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './auth.css';

// Enhanced login + inline register toggle
const LoginPage = () => {
  const { login, register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'vendor') navigate('/vendor/dashboard', { replace: true });
      else navigate('/customer/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null); setSuccess(null);
    try {
      if (isRegister) {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
        await register(form.name, form.email, form.password);
        setSuccess('Registration successful');
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{isRegister ? 'Register' : 'Login'}</h2>
        {loading && <p className="muted">Loading context...</p>}
        <form onSubmit={onSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input name="name" value={form.name} onChange={onChange} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={onChange} required />
          </div>
          {isRegister && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} required />
            </div>
          )}
          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}
          <button type="submit" disabled={submitting} className="primary-btn full">
            {submitting ? 'Please wait...' : (isRegister ? 'Create Account' : 'Login')}
          </button>
        </form>
        <div className="switch-line">
          {isRegister ? 'Have an account?' : 'New user?'}{' '}
          <button type="button" className="link-btn" onClick={()=> { setIsRegister(!isRegister); setError(null); setSuccess(null); }}>
            {isRegister ? 'Login here' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
