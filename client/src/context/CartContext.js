import React, { createContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch(action.type){
    case 'ADD_TO_CART': {
      const item = action.payload;
      const existing = state.items.find(i => i.id === item.id);
      let items;
      if (existing) {
        items = state.items.map(i => i.id === item.id ? { ...i, qty: (i.qty || 1) + (item.qty || 1) } : i);
      } else {
        items = [...state.items, { ...item, qty: item.qty || 1 }];
      }
      return { ...state, items };
    }
    case 'UPDATE_QTY': {
      const { id, qty } = action.payload;
      const items = state.items.map(i => i.id === id ? { ...i, qty } : i).filter(i => i.qty > 0);
      return { ...state, items };
    }
    case 'REMOVE_FROM_CART': {
      return { ...state, items: state.items.filter(i => i.id !== action.payload.id) };
    }
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

const initial = { items: [] };

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initial, () => {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : initial;
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  const totalItems = state.items.reduce((s,i)=> s + (i.qty || 1), 0);
  const totalPrice = state.items.reduce((s,i)=> s + (i.price * (i.qty || 1)), 0);

  return (
    <CartContext.Provider value={{ cart: state, dispatch, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
