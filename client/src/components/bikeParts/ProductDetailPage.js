import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import bikePartsService from '../../services/bikePartsService';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import LocationContext from '../../context/LocationContext';
import { useContext } from 'react';
import { formatINR } from '../../utils/currency';

// Simple image zoom on hover via magnifier box
function ZoomImage({ src, alt }) {
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false });
  const containerRef = useRef(null);
  const handleMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom(z => ({ ...z, x, y }));
  };
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setZoom(z => ({ ...z, show: true }))}
      onMouseLeave={() => setZoom(z => ({ ...z, show: false }))}
      onMouseMove={handleMove}
      style={{position:'relative', width:'100%', maxWidth:420, aspectRatio:'4/3', background:'#f1f5f9', borderRadius:12, overflow:'hidden', cursor:'zoom-in'}}
    >
      {src ? <img src={src} alt={alt} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#94a3b8'}}>No Image</div>}
      {zoom.show && src && (
        <div style={{position:'absolute', top:0, right:'-52%', width:'50%', height:'100%', border:'1px solid #cbd5e1', background:'#fff', borderRadius:12, display:'none'}} />
      )}
      {zoom.show && src && (
        <div style={{position:'absolute', inset:0, pointerEvents:'none'}} />
      )}
    </div>
  );
}

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, dispatch } = useCart?.() || { cart:{items:[]}, dispatch:()=>{} };
  const { location: userLoc } = useContext(LocationContext) || {};
  const [part, setPart] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    setLoading(true);
    bikePartsService.getPartById(id)
      .then(r => { setPart(r.data); setError(''); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load product'))
      .finally(()=> setLoading(false));
  }, [id]);

  const totalPrice = part ? part.price * qty : 0;

  const inc = () => setQty(q => Math.min(99, q+1));
  const dec = () => setQty(q => Math.max(1, q-1));
  const onQtyChange = (e) => {
    const v = Number(e.target.value) || 1; setQty(Math.min(99, Math.max(1, v)));
  };

  const addToCart = () => {
    if (!part) return; dispatch({ type:'ADD_TO_CART', payload:{ id: part._id, name: part.name || part.model, price: part.price, qty } });
    alert('Added to cart');
    navigate('/');
  };

  const openMaps = () => {
    if (!part?.shop?.location?.coordinates) { alert('Shop location not available'); return; }
    const [lng, lat] = part.shop.location.coordinates;
    const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}`;
    const url = userLoc ? `${base}&origin=${encodeURIComponent(userLoc.latitude+','+userLoc.longitude)}` : base;
    window.open(url, '_blank');
  };

  const placeOrder = async () => {
    if (!user) { navigate('/login'); return; }
    if (!part) return;
    const phone = window.prompt('Enter your active phone number');
    if (!phone) return;
    const dateStr = window.prompt('Enter collection date (YYYY-MM-DD)');
    try {
      setPlacing(true);
      const orderItems = [{ name: part.name || part.model, qty, price: part.price, product: part._id }];
      const shippingAddress = userLoc ? { lat: userLoc.latitude, lng: userLoc.longitude } : { address: 'Unknown' };
      const { data } = await api.post('/orders', { orderItems, shippingAddress, paymentMethod: 'cod', phone, collectionDate: dateStr });
  alert('Order placed. ID: '+data._id);
  navigate('/');
    } catch(e){
      alert(e.response?.data?.message || 'Order failed');
    } finally { setPlacing(false); }
  };

  if (loading) return <div style={{padding:'1rem'}}>Loading...</div>;
  if (error) return <div style={{padding:'1rem', color:'red'}}>{error}</div>;
  if (!part) return null;

  return (
    <div style={{maxWidth:1000, margin:'0 auto', padding:'1rem', display:'grid', gap:'1.25rem', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))'}}>
      <div>
        <ZoomImage src={part.images?.[0] ? ensureAbsolute(part.images[0]) : null} alt={part.name || part.model} />
        <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>
          {part.images?.slice(0,5).map((img,i)=>(
            <img key={i} src={ensureAbsolute(img)} alt={i} style={{width:60,height:60,objectFit:'contain',background:'#f1f5f9',borderRadius:8,border:'1px solid #e2e8f0'}} />
          ))}
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:'0.85rem'}}>
        <h1 style={{margin:'0 0 .25rem', fontSize:'1.15rem'}}>{part.name || part.model}</h1>
        <div style={{fontSize:'.8rem', color:'#475569'}}>{part.company && <><strong>{part.company}</strong> • </>}{part.model || part.type}</div>
        <div style={{fontSize:'.75rem', color:'#475569'}}>Price (each): <strong>{formatINR(part.price)}</strong></div>
        {typeof part.countInStock === 'number' && <div style={{fontSize:'.65rem', color: part.countInStock>0?'#15803d':'#b91c1c'}}>Stock: {part.countInStock}</div>}
        {part.description && <p style={{fontSize:'.7rem', lineHeight:1.4, margin:0}}>{part.description}</p>}
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:'.7rem'}}>Qty:</span>
          <div style={{display:'flex', alignItems:'center', border:'1px solid #cbd5e1', borderRadius:8}}>
            <button type='button' onClick={dec} style={qtyBtnStyle}>-</button>
            <input value={qty} onChange={onQtyChange} style={{width:46, textAlign:'center', fontSize:'.75rem', border:'none', outline:'none', background:'#fff'}} />
            <button type='button' onClick={inc} style={qtyBtnStyle}>+</button>
          </div>
          <div style={{marginLeft:'auto', fontSize:'.75rem'}}>Total: <strong>{formatINR(totalPrice)}</strong></div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button onClick={addToCart} className='btn-outline' style={actBtn}>Add To Cart</button>
          <button onClick={openMaps} className='btn-outline' style={actBtn}>Get Maps</button>
          <button disabled={placing} onClick={placeOrder} className='btn-primary' style={actBtn}>{placing? 'Placing...' : 'Place Order'}</button>
        </div>
      </div>
    </div>
  );
};

const qtyBtnStyle = { padding:'4px 10px', background:'#fff', border:'none', cursor:'pointer', fontSize:'.85rem' };
const actBtn = { flex:'1 1 140px' };

function ensureAbsolute(url){
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
}

export default ProductDetailPage;
