import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.css';

const LandingPage = () => {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const onSearch = (e) => {
    e.preventDefault();
    const qs = q ? `?keyword=${encodeURIComponent(q)}` : '';
    navigate(`/parts${qs}`);
  };

  return (
    <div className="lp-wrap">
      <header className="lp-header">
        <div className="lp-brand">Smart Bike Parts Hub</div>
        <form className="lp-search" onSubmit={onSearch}>
          <select className="lp-cats" defaultValue="all">
            <option value="all">All categories</option>
          </select>
          <input className="lp-input" placeholder="Search parts, brands, models..." value={q} onChange={(e)=> setQ(e.target.value)} />
          <button className="lp-btn" type="submit">Search</button>
        </form>
        <div className="lp-actions">
          <button type="button" className="lp-link" onClick={()=> navigate('/login')}>Login / Signup</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-content">
          <h1>Explore parts by bike model</h1>
          <p>Find quality parts from local vendors. Vendors add parts, you discover them here.</p>
          <div className="lp-cta">
            <button className="lp-cta-btn" onClick={()=> navigate('/parts')}>Shop Now</button>
          </div>
        </div>
      </section>

      <section className="lp-features">
        <div className="lp-feature">Fast local discovery</div>
        <div className="lp-feature">Vendor-managed inventory</div>
        <div className="lp-feature">Secure login for ordering soon</div>
      </section>
    </div>
  );
};

export default LandingPage;
