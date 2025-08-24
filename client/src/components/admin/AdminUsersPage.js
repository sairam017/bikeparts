import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    api.get('/admin/users').then(({data})=> setUsers(data)).catch(e=> setError(e.response?.data?.message||e.message)).finally(()=> setLoading(false));
  }, []);
  return (
    <div style={{minHeight:'100vh', background:'#fff'}}>
      <div style={{background:'#0a2aa7', color:'#fff', padding:'0.75rem 1rem', fontWeight:800}}>Users</div>
      <div style={{padding:'1rem 1.25rem'}}>
        {loading && 'Loading...'}
        {error && <div style={{color:'red'}}>{error}</div>}
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr><th align="left">Name</th><th align="left">Email</th><th align="left">Role</th></tr>
          </thead>
          <tbody>
            {users.map(u=> (
              <tr key={u._id} style={{borderTop:'1px solid #e5e7eb'}}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersPage;
