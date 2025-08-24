import React, { useEffect, useState } from 'react';
import { formatINR } from '../../utils/currency';
import { Link, useNavigate } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import bikePartsService from '../../services/bikePartsService';
import api from '../../services/api';

const CartPage = () => {
  // All hooks at top-level (no conditional returns before they are called)
  const cartCtx = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Safe fallbacks if provider not yet mounted
  const cart = cartCtx?.cart || { items: [] };
  const dispatch = cartCtx?.dispatch || (()=>{});
  const totalItems = cartCtx?.totalItems || 0;
  const totalPrice = cartCtx?.totalPrice || 0;

  const removeItem = (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: { id } });
  const clear = () => dispatch({ type: 'CLEAR_CART' });

  // Recommended (related) items state
  const [reco, setReco] = useState([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRecoError(null);
      // Only attempt if user logged in
      if (!user) { setReco([]); return; }
      const items = cart.items;
      if (!items.length) {
        // Fallback: show latest few general parts for discovery
        try {
          setRecoLoading(true);
          const { data } = await bikePartsService.getParts();
          const arr = Array.isArray(data) ? data : (data.products || []);
          if (!cancelled) setReco(arr.slice(0,6));
        } catch (e) {
          if (!cancelled) setRecoError('Failed to load suggestions');
        } finally { if (!cancelled) setRecoLoading(false); }
        return;
      }
      try {
        setRecoLoading(true);
        // Collect unique (company,model) pairs from cart
        const filters = [];
        items.forEach(i => {
          if (i.company || i.model) {
            filters.push({ company: i.company, model: i.model });
          }
        });
        // De-duplicate by JSON key
        const seen = new Set();
        const unique = filters.filter(f => {
          const key = JSON.stringify([f.company||'', f.model||'']);
            if (seen.has(key)) return false; seen.add(key); return true;
        }).slice(0,5); // cap number of queries
        const promises = unique.map(f => bikePartsService.getParts({ company: f.company, model: f.model }));
        const results = await Promise.all(promises);
        const merged = [];
        const cartIds = new Set(items.map(i => i.id));
        results.forEach(r => {
          const data = r.data;
          const arr = Array.isArray(data) ? data : (data.products || []);
          arr.forEach(p => { if (!cartIds.has(p._id)) merged.push(p); });
        });
        // Additional general fetch if not enough
        if (merged.length < 6) {
          try {
            const { data } = await bikePartsService.getParts();
            const all = Array.isArray(data) ? data : (data.products || []);
            all.forEach(p => { if (merged.length < 12 && !cartIds.has(p._id) && !merged.find(m=>m._id===p._id)) merged.push(p); });
          } catch { /* ignore */ }
        }
        // Sort by simple heuristic: same company/model first
        const score = (p) => {
          let s = 0;
          items.forEach(i => {
            if (i.company && p.company && i.company === p.company) s += 3;
            if (i.model && p.model && i.model === p.model) s += 4;
            if (i.type && p.type && i.type === p.type) s += 2;
          });
          return -s; // negative for ascending sort (lowest first)
        };
        merged.sort((a,b)=> score(a)-score(b));
        if (!cancelled) setReco(merged.slice(0,12));
      } catch (e) {
        if (!cancelled) setRecoError('Failed to load related items');
      } finally {
        if (!cancelled) setRecoLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cart.items, user]);

  const addReco = (p) => {
    dispatch({ type: 'ADD_TO_CART', payload: { id: p._id, name: p.name || p.model, price: p.price, qty: 1, company: p.company, model: p.model, type: p.type } });
  };

  const checkout = () => {
    if (!user) return navigate('/auth');
    navigate('/shipping');
  };

  const total = cart.items.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0);

  // New state for batch order placement
  const [phone, setPhone] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderMsg, setOrderMsg] = useState(null);

  const validatePhone = (p) => /^\d{10}$/.test(p); // simple 10 digit validation
  const isFutureOrToday = (dStr) => {
    if (!dStr) return false;
    const sel = new Date(dStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    return sel >= today;
  };

  const placeAll = async () => {
    if (!user) { navigate('/auth'); return; }
    setOrderMsg(null);
    if (!cart.items.length) { setOrderMsg('Cart empty'); return; }
    if (!validatePhone(phone)) { setOrderMsg('Enter valid 10 digit phone'); return; }
    if (!isFutureOrToday(collectionDate)) { setOrderMsg('Select today or a future collection date'); return; }
    try {
      setPlacing(true);
      const orderItems = cart.items.map(i => ({ name: i.name, qty: i.qty || 1, price: i.price, product: i.id }));
      const shippingAddress = { address: 'Cart order' }; // minimal placeholder (could enhance with stored preferred address or geolocation)
      const { data } = await api.post('/orders', { orderItems, shippingAddress, paymentMethod: 'cod', phone, collectionDate });
      setOrderMsg('Order placed. ID: ' + data._id);
      // Clear cart after success
      clear();
      setTimeout(()=> navigate('/'), 800);
    } catch(e){
      setOrderMsg(e.response?.data?.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  // If context not ready, show lightweight placeholder while still keeping hook order stable
  if (!cartCtx) {
    return <div style={{padding:'1rem'}}>Loading cart...</div>;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
  <div style={{display:'flex', alignItems:'center', gap:12}}>
    <h2 style={{margin:0}}>Cart</h2>
    <button onClick={()=> navigate('/myorders')} className="btn-outline" style={{marginLeft:'auto'}}>My Orders</button>
  </div>
      {cart.items.length === 0 && <p style={{color:'#64748b'}}>Cart is empty <Link to="/">Go Back</Link></p>}
  <ul>
        {cart.items.map(i => (
          <li key={i.id} style={{ marginBottom: '.6rem', background:'#fff', padding:'10px', borderRadius:12, boxShadow:'0 6px 18px rgba(2,6,23,.08)' }}>
            {i.name} x {i.qty || 1} = {formatINR(i.price * (i.qty || 1))}
            <button onClick={() => removeItem(i.id)} style={{ marginLeft: '1rem' }}>Remove</button>
          </li>
        ))}
      </ul>
  <h3>Total: {formatINR(total)}</h3>
      <button disabled={!cart.items.length} onClick={checkout}>Proceed To Checkout</button>
      <button disabled={!cart.items.length} onClick={clear} style={{ marginLeft: '0.5rem' }}>Clear</button>

      {/* Batch place order section */}
      {!!cart.items.length && (
        <div style={{marginTop:'1.5rem', background:'#fff', padding:'1rem', borderRadius:12, boxShadow:'0 6px 18px rgba(2,6,23,.06)', display:'grid', gap:12}}>
          <h3 style={{margin:0, fontSize:'1rem'}}>Place Order For All Items</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:12}}>
            <div style={{display:'flex', flexDirection:'column', gap:4}}>
              <label style={{fontSize:12, fontWeight:600}}>Phone (10 digits)</label>
              <input value={phone} onChange={e=> setPhone(e.target.value)} placeholder="Active phone" style={{padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:8}} maxLength={10} />
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:4}}>
              <label style={{fontSize:12, fontWeight:600}}>Collection Date</label>
              <input type="date" value={collectionDate} onChange={e=> setCollectionDate(e.target.value)} style={{padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:8}} />
            </div>
          </div>
          <button onClick={placeAll} disabled={placing} style={{padding:'8px 14px', borderRadius:8, border:'1px solid #1d4ed8', background:'#1d4ed8', color:'#fff', fontWeight:600}}>{placing? 'Placing...' : 'Place All Items (COD)'}</button>
          {orderMsg && <div style={{fontSize:12, color: orderMsg.startsWith('Order placed') ? '#15803d' : '#b91c1c'}}>{orderMsg}</div>}
        </div>
      )}

      {/* Recommendations */}
      <div style={{marginTop:'2rem'}}>
        <h3 style={{margin:'0 0 .75rem'}}>Related Items {recoLoading && <span style={{fontSize:12, fontWeight:400}}>Loading…</span>}</h3>
        {recoError && <div style={{color:'red', fontSize:12}}>{recoError}</div>}
        {!recoLoading && !recoError && !reco.length && (
          <div style={{fontSize:12, color:'#64748b'}}>No suggestions available.</div>
        )}
        {!!reco.length && (
          <div style={{display:'grid', gap:'0.75rem', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
            {reco.map(p => (
              <div key={p._id} style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 10px', display:'flex', flexDirection:'column', gap:6}}>
                <div style={{fontSize:'.8rem', fontWeight:600, lineHeight:1.1}}>{p.name || p.model}</div>
                <div style={{fontSize:'.65rem', color:'#475569'}}>{p.company || p.brand} {p.model ? '• '+p.model : ''}</div>
                <div style={{fontSize:'.7rem', fontWeight:700, color:'#0a2aa7'}}>{formatINR(p.price)}</div>
                <button onClick={()=> addReco(p)} style={{fontSize:'.65rem', padding:'4px 6px', borderRadius:6, border:'1px solid #1d4ed8', background:'#1d4ed8', color:'#fff'}}>Add</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
