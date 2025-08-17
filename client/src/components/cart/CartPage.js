import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';

const CartPage = () => {
  const { cart, dispatch } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const removeItem = (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: { id } });
  const clear = () => dispatch({ type: 'CLEAR_CART' });

  const checkout = () => {
    if (!user) return navigate('/auth');
    navigate('/shipping');
  };

  const total = cart.items.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Cart</h2>
      {cart.items.length === 0 && <p>Cart is empty <Link to="/">Go Back</Link></p>}
      <ul>
        {cart.items.map(i => (
          <li key={i.id} style={{ marginBottom: '.5rem' }}>
            {i.name} x {i.qty || 1} = ${(i.price * (i.qty || 1)).toFixed(2)}
            <button onClick={() => removeItem(i.id)} style={{ marginLeft: '1rem' }}>Remove</button>
          </li>
        ))}
      </ul>
      <h3>Total: ${total.toFixed(2)}</h3>
      <button disabled={!cart.items.length} onClick={checkout}>Proceed To Checkout</button>
      <button disabled={!cart.items.length} onClick={clear} style={{ marginLeft: '0.5rem' }}>Clear</button>
    </div>
  );
};

export default CartPage;
