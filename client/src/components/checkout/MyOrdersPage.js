import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/orders/my/list')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load orders'))
      .finally(()=> setLoading(false));
  }, []);

  const rows = useMemo(() => orders.map(o => {
    const firstItem = o.orderItems?.[0];
    const productName = firstItem?.name || firstItem?.product?.name || firstItem?.product?.model || 'Item';
    const extraCount = (o.orderItems?.length || 0) - 1;
    const shop = firstItem?.product?.shop;
    const shopPhone = shop?.phone || 'N/A';
    const pickup = o.collectionDate ? new Date(o.collectionDate).toLocaleDateString() : '-';
    let mapsUrl = null;
    if (shop?.location?.coordinates && Array.isArray(shop.location.coordinates)) {
      const [lng, lat] = shop.location.coordinates; // stored [lng,lat]
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat+','+lng)}`;
    }
    return {
      id: o._id,
      product: productName + (extraCount > 0 ? ` +${extraCount} more` : ''),
      pickup,
      shopPhone,
      mapsUrl
    };
  }), [orders]);

  return (
    <div style={{ padding:'1rem', maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{margin:'0 0 1rem'}}>My Orders</h2>
      {loading && <div style={{padding:'0.5rem 0'}}>Loading…</div>}
      {error && <div style={{color:'#b91c1c', padding:'0.5rem 0'}}>{error}</div>}
      {!loading && !error && !orders.length && (
        <div style={{fontSize:14, color:'#475569'}}>No orders yet.</div>
      )}
      {!!orders.length && (
        <div style={{overflowX:'auto', border:'1px solid #e2e8f0', borderRadius:12}}>
          <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0}}>
            <thead style={{background:'#f1f5f9'}}>
              <tr>
                <Th>Order Id</Th>
                <Th>Product(s)</Th>
                <Th>Pickup Date</Th>
                <Th>Shop Mobile</Th>
                <Th>Maps</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                  <Td mono>{r.id}</Td>
                  <Td>{r.product}</Td>
                  <Td>{r.pickup}</Td>
                  <Td>{r.shopPhone}</Td>
                  <Td>{r.mapsUrl ? <a href={r.mapsUrl} target="_blank" rel="noreferrer" style={{color:'#1d4ed8', textDecoration:'none'}}>Open</a> : '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Th = ({ children }) => (
  <th style={{textAlign:'left', padding:'10px 12px', fontSize:12, fontWeight:700, color:'#0f172a', borderBottom:'1px solid #e2e8f0'}}>{children}</th>
);
const Td = ({ children, mono }) => (
  <td style={{padding:'9px 12px', fontSize:12, fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit', whiteSpace:'nowrap'}}>{children}</td>
);

export default MyOrdersPage;
