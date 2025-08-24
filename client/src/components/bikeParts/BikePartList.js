import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import bikePartsService from '../../services/bikePartsService';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import LocationContext from '../../context/LocationContext';
import './bikeParts.css';
import { formatINR } from '../../utils/currency';
import { useContext } from 'react';

const BikePartList = () => {
    const [parts, setParts] = useState([]);
    const [companies, setCompanies] = useState([]);
    // Removed brand support
    const [types, setTypes] = useState([]);
    const [models, setModels] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    // const [selectedBrand, setSelectedBrand] = useState(''); // removed
    const [selectedType, setSelectedType] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useAuth?.() || { user: null };
    const { cart, dispatch } = useCart?.() || { cart:{ items:[] }, dispatch:()=>{} };
    const { location: userLoc } = useContext(LocationContext) || {}; // {latitude, longitude}
    const [distanceCache, setDistanceCache] = useState({}); // productId -> km
    const [prefShopProductId, setPrefShopProductId] = useState(null); // to highlight chosen product by distance
    // Map modal state
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [originInput, setOriginInput] = useState('');
    const [mapPart, setMapPart] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    // Initial: read URL params and load options
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const c = params.get('company') || '';
        // brand removed
    const t = params.get('type') || '';
        const m = params.get('model') || '';
    const kw = params.get('keyword') || '';
        setSelectedCompany(c);
        // setSelectedBrand(b);
        setSelectedType(t);
        setSelectedModel(m);
    setSearchTerm(kw);
        setLoading(true);
        Promise.all([
            bikePartsService.getCompanies(),
            bikePartsService.getTypes(),
            bikePartsService.getParts({ company: c || undefined, type: t || undefined, model: m || undefined }),
        ])
        .then(([cRes, tRes, pRes]) => {
            setCompanies(cRes.data?.companies || []);
            setTypes(tRes.data?.types || []);
            const data = pRes.data;
            setParts(Array.isArray(data) ? data : data.products || []);
        })
        .catch(err => setError(err.response?.data?.message || 'Failed to load'))
        .finally(()=> setLoading(false));
    }, []);

    // When company changes: load models
    useEffect(() => {
        if (!selectedCompany) { setModels([]); return; }
        setLoading(true);
        bikePartsService.getModelsByCompany(selectedCompany)
            .then(r => setModels(r.data?.models || []))
            .catch(err => setError(err.response?.data?.message || 'Failed to load models'))
            .finally(()=> setLoading(false));
    }, [selectedCompany]);

    // When model changes: fetch parts filtered
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const keyword = params.get('keyword') || undefined;
        const filters = { ...(keyword ? { keyword } : {}) };
        if (selectedCompany) filters.company = selectedCompany;
    // brand removed
        if (selectedType) filters.type = selectedType;
        if (selectedModel) filters.model = selectedModel;
        setLoading(true);
        bikePartsService.getParts(filters)
            .then(response => {
                const data = response.data;
                setParts(Array.isArray(data) ? data : data.products || []);
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to load parts'))
            .finally(()=> setLoading(false));
    }, [selectedCompany, selectedModel, selectedType, location.search]);

    const haversineKm = (lat1, lon1, lat2, lon2) => {
        const toRad = (v) => v * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(lat2-lat1);
        const dLon = toRad(lon2-lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const computeDistanceFor = (part) => {
        if (!userLoc || !part?.shop?.location?.coordinates) return null;
        const [lng, lat] = part.shop.location.coordinates; // stored as [lng, lat]
        const km = haversineKm(userLoc.latitude, userLoc.longitude, lat, lng);
        return km;
    };

    useEffect(()=>{
        // Precompute distances when user location and parts change
        if (!userLoc) return;
        const next = {};
        parts.forEach(p => {
            const d = computeDistanceFor(p);
            if (d != null) next[p._id] = d;
        });
        setDistanceCache(next);
        // pick nearest product id (if multiple parts from different shops)
        const entries = Object.entries(next).sort((a,b)=> a[1]-b[1]);
        if (entries.length) setPrefShopProductId(entries[0][0]);
    }, [userLoc, parts]);

    // Removed Add to Cart & related suggestion logic per request

    const openMaps = (part) => {
        if (!part?.shop?.location?.coordinates) { alert('Shop location not available'); return; }
        // If we have user geolocation, open immediately; otherwise prompt for origin
        if (userLoc) {
            const [lng, lat] = part.shop.location.coordinates;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}&origin=${encodeURIComponent(userLoc.latitude+','+userLoc.longitude)}`;
            window.open(url, '_blank');
        } else {
            setMapPart(part);
            setMapModalOpen(true);
        }
    };

    const submitOrigin = (e) => {
        e.preventDefault();
        if (!mapPart?.shop?.location?.coordinates) { setMapModalOpen(false); return; }
        const [lng, lat] = mapPart.shop.location.coordinates;
        const base = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}`;
        const url = originInput.trim() ? `${base}&origin=${encodeURIComponent(originInput.trim())}` : base;
        window.open(url, '_blank');
        setMapModalOpen(false);
        setOriginInput('');
        setMapPart(null);
    };

    const placeOrderQuick = async (part) => {
        if (!user) { window.location.href='/auth'; return; }
        try {
            // create single-item order simplified (bypasses multi-step for quick order)
            const orderItems = [{ name: part.name || part.model, qty:1, price: part.price, product: part._id }];
            const shippingAddress = userLoc ? { lat: userLoc.latitude, lng: userLoc.longitude } : { address: 'Unknown' };
            const { data: order } = await api.post('/orders', { orderItems, shippingAddress, paymentMethod: 'cod' });
            alert('Order placed (COD). Order ID: '+order._id);
            window.location.href = '/';
        } catch(e){
            alert(e.response?.data?.message || 'Order failed');
        }
    };

    if (loading) return <div className="parts-wrap">Loading...</div>;
    if (error) return <div className="parts-wrap" style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="parts-wrap" style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
            {/* Horizontal Filters */}
            <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'0.75rem', boxShadow:'0 6px 18px rgba(2,6,23,.06)', display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center'}}>
                <span style={{fontWeight:800, color:'#0a2aa7'}}>Filter:</span>
                <form onSubmit={e=> { e.preventDefault();
                    const params = new URLSearchParams(location.search);
                    if (searchTerm) params.set('keyword', searchTerm); else params.delete('keyword');
                    navigate({ pathname: '/parts', search: params.toString() });
                }} style={{display:'flex', gap:6, alignItems:'center'}}>
                    <input value={searchTerm} onChange={e=> setSearchTerm(e.target.value)} placeholder="Search part name" style={{padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'.8rem'}} />
                    <button type="submit" className="btn-outline" style={{padding:'6px 12px'}}>Search</button>
                </form>
                <select value={selectedType} onChange={e=> setSelectedType(e.target.value)} style={selStyle}>
                    <option value="">Type</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {/* Brand filter removed */}
                <select value={selectedCompany} onChange={e=> { setSelectedCompany(e.target.value); setSelectedModel(''); }} style={selStyle}>
                    <option value="">Company</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedModel} onChange={e=> setSelectedModel(e.target.value)} disabled={!selectedCompany} style={selStyle}>
                    <option value="">Model{!selectedCompany?' (select company)':''}</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={()=> { setSelectedType(''); setSelectedCompany(''); setSelectedModel(''); setSearchTerm('');
                    const params = new URLSearchParams();
                    navigate({ pathname: '/parts', search: params.toString() });
                 }} className="btn-outline" style={{padding:'6px 12px'}}>Reset</button>
                <div style={{marginLeft:'auto', fontSize:12, color:'#475569'}}>Showing {parts.length} items</div>
            </div>

            {/* Parts Grid */}
            <section>
                <h2 style={{margin:'0 0 .5rem'}}>Available Parts</h2>
                {!parts.length && <p>No parts found{searchTerm?` for "${searchTerm}"`:''}.</p>}
                <div className="parts-list">
                                {parts.map(part => {
                                    const distanceKm = distanceCache[part._id];
                                    const highlight = part._id === prefShopProductId;
                                    return (
                                        <div key={part._id} className="part-card compact" style={highlight ? {outline:'2px solid #1d4ed8'} : {}}>
                                            <Link to={`/product/${part._id}`} style={{display:'block'}}>
                                                {part.images?.length ? (
                                                    <img alt={part.model || part.name || 'part'} src={ensureAbsolute(part.images[0])} style={{width:'100%', height:110, objectFit:'contain', background:'#f1f5f9', borderRadius:8}} />
                                                ) : (
                                                    <div style={{width:'100%', height:110, background:'#f1f5f9', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:12}}>No Image</div>
                                                )}
                                            </Link>
                                            <h4 style={{marginTop:4, fontSize:'.7rem'}}>{part.name || part.model}</h4>
                                            <div className="part-meta" style={{fontSize:'.6rem'}}>{part.company ? part.company+' • ' : ''}{part.model || (part.type || 'Part')} <span className="part-price" style={{fontSize:'.5rem'}}>{formatINR(part.price)}</span></div>
                                            {part.description && (
                                                <p style={{margin:'4px 0 0', fontSize:'.55rem', lineHeight:1.2, color:'#475569'}}>
                                                    {part.description.length > 90 ? part.description.slice(0,90)+'…' : part.description}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                </div>
            </section>
            {mapModalOpen && (
                <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}} onClick={(e)=> { if(e.target===e.currentTarget) { setMapModalOpen(false); setOriginInput(''); setMapPart(null);} }}>
                    <form onSubmit={submitOrigin} style={{background:'#fff', padding:'1rem 1.25rem', borderRadius:12, width:'100%', maxWidth:420, display:'grid', gap:'0.75rem'}}>
                        <h3 style={{margin:0}}>Select Start Location</h3>
                        <div style={{fontSize:12, color:'#475569'}}>We could not detect your location automatically. Enter a starting address / area to open directions to the shop.</div>
                        <input value={originInput} onChange={e=> setOriginInput(e.target.value)} placeholder="Your starting address / area" required style={{padding:'0.55rem 0.7rem', border:'1px solid #cbd5e1', borderRadius:8}} />
                        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                            <button type="button" className="btn-outline" onClick={()=> { setMapModalOpen(false); setOriginInput(''); setMapPart(null); }}>Cancel</button>
                            <button type="submit" className="btn-primary">Open Maps</button>
                        </div>
                    </form>
                </div>
            )}
    {/* Toasts removed with action buttons */}
        </div>
    );
};

function ensureAbsolute(url){
    if (!url) return url;
    if (url.startsWith('http')) return url;
    // Point to local server files
    return `http://localhost:5000${url}`;
}

const selStyle = { padding:'6px 10px', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', fontSize:'.8rem' };

export default BikePartList;
 
// Inline tiny component for one-line truncation with view more/less
function ExpandableText({ text }){
    const [open, setOpen] = React.useState(false);
    const truncated = (
        <p style={{fontSize:12, color:'#555', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0}}>{text}</p>
    );
    const full = (
        <p style={{fontSize:12, color:'#555', margin:0}}>{text}</p>
    );
    if (text.length <= 80) return full; // short texts just show
    return (
        <div>
            {open ? full : truncated}
            <button onClick={()=> setOpen(v=>!v)} style={{background:'transparent', border:'none', color:'#1d4ed8', padding:0, fontSize:12}}>
                {open ? 'View less' : 'View more'}
            </button>
        </div>
    );
}
