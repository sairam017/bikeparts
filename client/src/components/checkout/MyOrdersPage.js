import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/orders/my/list').then(res => setOrders(res.data)).finally(()=> setLoading(false));
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>My Orders</h2>
      {loading && <p>Loading...</p>}
      <ul>
        {orders.map(o => (
          <li key={o._id}>{o._id} - Paid: {o.isPaid ? 'Yes' : 'No'} - Delivered: {o.isDelivered ? 'Yes' : 'No'}</li>
        ))}
      </ul>
    </div>
  );
};

export default MyOrdersPage;
