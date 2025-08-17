import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import bikePartsService from '../../services/bikePartsService';
import './bikeParts.css';

const BikePartList = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const keyword = params.get('keyword') || undefined;
        setLoading(true);
        bikePartsService.getParts(keyword ? { keyword } : undefined)
          .then(response => {
            const data = response.data;
            setParts(Array.isArray(data) ? data : data.products || []);
          })
          .catch(err => setError(err.response?.data?.message || 'Failed to load'))
          .finally(()=> setLoading(false));
    }, [location.search]);

    if (loading) return <div className="parts-wrap">Loading...</div>;
    if (error) return <div className="parts-wrap" style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="parts-wrap">
            <h2>Bike Parts</h2>
            {!parts.length && <p>No parts found.</p>}
                        <div className="parts-list">
                                {parts.map(part => (
                                        <div key={part._id} className="part-card">
                                                                        {part.images?.length ? (
                                                                            <img alt={part.model || part.name || 'part'} src={ensureAbsolute(part.images[0])} style={{width:'100%', height:160, objectFit:'cover', borderRadius:6}} />
                                                ) : (
                                                    <div style={{width:'100%', height:160, background:'#eee', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#888'}}>No Image</div>
                                                )}
                                                <h4 style={{marginTop:8}}>{part.name || part.model}</h4>
                                                <div className="part-meta">{part.brand || part.company} • {(part.type || 'Part')} • ${part.price}</div>
                                                {typeof part.countInStock === 'number' && <div className="part-meta">In stock: {part.countInStock}</div>}
                                                {part.description && <p style={{fontSize:12, color:'#555'}}>{part.description}</p>}
                                                {part.shop?.name && (<div className="part-meta">Shop: {part.shop.name}</div>)}
                                        </div>
                                ))}
                        </div>
        </div>
    );
};

function ensureAbsolute(url){
    if (!url) return url;
    if (url.startsWith('http')) return url;
    // Point to local server files
    return `http://localhost:5000${url}`;
}

export default BikePartList;
