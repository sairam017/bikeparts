import React, { useEffect, useState } from 'react';
import { formatINR } from '../../utils/currency';
import bikePartsService from '../../services/bikePartsService';

const AdminProductsPage = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(()=>{
    setLoading(true);
    bikePartsService.getParts().then(({data})=> setParts(data.products || data)).catch(e=> setError(e.response?.data?.message||e.message)).finally(()=> setLoading(false));
  },[]);
  return (
    <div style={{minHeight:'100vh', background:'#fff'}}>
      <div style={{background:'#0a2aa7', color:'#fff', padding:'0.75rem 1rem', fontWeight:800}}>Products</div>
      <div style={{padding:'1rem 1.25rem', display:'grid', gap:'0.75rem'}}>
        {loading && 'Loading...'}
        {error && <div style={{color:'red'}}>{error}</div>}
        {parts.map(p=> (
          <div key={p._id} style={{border:'2px solid #1d4ed8', borderRadius:10, padding:'0.75rem'}}>
            <div style={{display:'flex', gap:'0.75rem'}}>
              {p.images?.[0] && (<img alt={p.name||p.model} src={p.images[0].startsWith('http')? p.images[0]:`http://localhost:5000${p.images[0]}`} style={{width:100,height:100,objectFit:'cover',borderRadius:8}} />)}
              <div>
                <div style={{fontWeight:700,color:'#1d4ed8'}}>{p.name || p.model}</div>
                <div style={{fontSize:12}}>Brand: {p.brand||p.company} • Type: {p.type||'Part'} • Price: {formatINR(p.price)}</div>
                <div style={{fontSize:12}}>Rating: {p.rating?.toFixed?.(1)||0} ({p.numReviews||0})</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProductsPage;
