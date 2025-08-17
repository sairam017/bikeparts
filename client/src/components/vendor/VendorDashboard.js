import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import bikePartsService from '../../services/bikePartsService';
import './vendor.css';
import useAuth from '../../hooks/useAuth';

const VendorDashboard = () => {
  const [tab, setTab] = useState('shop');
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name:'', address:'', phone:'', website:'', latitude:'', longitude:'' });

  const [part, setPart] = useState({ name:'', model:'', company:'', vehicleYear:'', price:'', description:'', brand:'', category:'', countInStock:'', image:null, imageUrl:'' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const { logout } = useAuth();
  const bgStyle = useMemo(()=>({ minHeight: '100vh', background: '#ffffff', color: '#0b2e68' }), []);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/shops/me').then(({data}) => {
      setShop(data);
      setForm({
        name: data.name || '',
        address: data.address || '',
        phone: data.phone || '',
        website: data.website || '',
        latitude: data.location?.coordinates ? String(data.location.coordinates[1]) : '',
        longitude: data.location?.coordinates ? String(data.location.coordinates[0]) : ''
      });
    }).catch(e => setError(e.response?.data?.message || e.message)).finally(()=> setLoading(false));
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onPartChange = (e) => setPart({ ...part, [e.target.name]: e.target.value });
  const onImageChange = (e) => setPart(prev=> ({ ...prev, image: e.target.files?.[0] || null }));

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraOn(true);
    } catch (e) {
      alert('Camera not available: ' + (e.message || '')); 
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPart(p => ({ ...p, image: file }));
    }, 'image/jpeg', 0.9);
  };

  const saveShop = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/shops/me', {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined
      });
      setShop(data);
      alert('Shop updated');
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to update');
    }
  };

  const createPart = async (e) => {
    e.preventDefault();
    setCreating(true); setMsg(null);
    try {
      if(!shop?.location?.coordinates || (shop.location.coordinates[0] === 0 && shop.location.coordinates[1] === 0)){
        setMsg('Please update your shop coordinates before adding parts.');
      } else {
        // Optional image upload first
        let imageUrl = null;
        if (part.image) {
          const formData = new FormData();
          formData.append('image', part.image);
          const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          imageUrl = uploadRes.data?.url || null;
        }
        const payload = {
          name: part.name,
          model: part.model,
          company: part.company,
          brand: part.brand,
          type: part.category || undefined,
          countInStock: part.countInStock ? Number(part.countInStock) : undefined,
          vehicleYear: Number(part.vehicleYear) || undefined,
          price: Number(part.price),
          description: part.description,
          imageUrl: part.imageUrl || undefined,
          images: imageUrl ? [imageUrl] : []
        };
        await bikePartsService.createPart(payload);
        setMsg('Part created');
        setPart({ name:'', model:'', company:'', vehicleYear:'', price:'', description:'', brand:'', category:'', countInStock:'', image:null, imageUrl:'' });
      }
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || 'Failed to create part');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: '1rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '1rem', color:'red' }}>{error}</div>;
  if (!shop) return <div style={{ padding: '1rem' }}>No shop found. Ask admin to create one.</div>;

  return (
    <div style={bgStyle} className="vendor-bg">
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', padding:'1rem', alignItems:'center', borderBottom:'2px solid #1d4ed8' }}>
        <button onClick={()=> setTab('shop')} disabled={tab==='shop'} className={tab==='shop' ? 'btn-primary' : 'btn-outline'}>Shop</button>
        <button onClick={()=> setTab('parts')} disabled={tab==='parts'} className={tab==='parts' ? 'btn-primary' : 'btn-outline'}>Parts</button>
        <div style={{marginLeft:'auto'}}>
          <button onClick={logout} className="btn-outline">Logout</button>
        </div>
      </div>

      {tab === 'shop' && (
        <form onSubmit={saveShop} className="vendor-card" style={{ display:'grid', gap:'0.75rem', maxWidth: 640, margin:'1rem' }}>
          <h2 style={{margin:0, color:'#1d4ed8'}}>My Shop</h2>
          <input name="name" placeholder="Shop Name" value={form.name} onChange={onChange} className="input-blue" />
          <input name="address" placeholder="Address" value={form.address} onChange={onChange} className="input-blue" />
          <input name="phone" placeholder="Contact Number" value={form.phone} onChange={onChange} className="input-blue" />
          <input name="website" placeholder="Website" value={form.website} onChange={onChange} className="input-blue" />
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <input name="latitude" placeholder="Latitude" value={form.latitude} onChange={onChange} className="input-blue" />
            <input name="longitude" placeholder="Longitude" value={form.longitude} onChange={onChange} className="input-blue" />
          </div>
          <button type="submit" className="btn-primary">Save Shop</button>
        </form>
      )}

      {tab === 'parts' && (
        <form onSubmit={createPart} className="vendor-card" style={{ display:'grid', gap:'0.75rem', maxWidth: 640, margin:'1rem' }}>
          <h2 style={{margin:0, color:'#1d4ed8'}}>Add Part</h2>
          <input name="name" placeholder="Product Name" value={part.name} onChange={onPartChange} className="input-blue" />
          <input name="model" placeholder="Model" value={part.model} onChange={onPartChange} required className="input-blue" />
          <input name="company" placeholder="Company" value={part.company} onChange={onPartChange} required className="input-blue" />
          <input name="brand" placeholder="Brand" value={part.brand} onChange={onPartChange} className="input-blue" />
          <input name="category" placeholder="Category" value={part.category} onChange={onPartChange} className="input-blue" />
          <input name="countInStock" type="number" placeholder="Count In Stock" value={part.countInStock} onChange={onPartChange} className="input-blue" />
          <input name="vehicleYear" placeholder="Vehicle Year" value={part.vehicleYear} onChange={onPartChange} className="input-blue" />
          <input name="price" type="number" placeholder="Price" value={part.price} onChange={onPartChange} required className="input-blue" />
          <textarea name="description" placeholder="Description" value={part.description} onChange={onPartChange} className="input-blue" style={{ minHeight:90 }} />
          <div>
            <label style={{display:'block', marginBottom:6, color:'#1d4ed8'}}>Product Image</label>
            <input type="file" accept="image/*" capture="environment" onChange={onImageChange} className="input-blue" style={{ padding:0 }} />
            <input name="imageUrl" placeholder="...or paste an Image URL" value={part.imageUrl} onChange={onPartChange} className="input-blue" style={{ marginTop:8 }} />
            {part.image && (
              <div style={{marginTop:8}}>
                <img alt="preview" src={URL.createObjectURL(part.image)} style={{maxWidth:220, maxHeight:220, borderRadius:8, border:'2px solid #1d4ed8'}} />
              </div>
            )}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr auto auto', gap:'0.5rem', alignItems:'center'}}>
            <div style={{color:'#1d4ed8'}}>Or use camera</div>
            {!cameraOn ? (
              <button type="button" className="btn-outline" onClick={startCamera}>Use Camera</button>
            ) : (
              <button type="button" className="btn-outline" onClick={stopCamera}>Stop Camera</button>
            )}
            {cameraOn && (
              <button type="button" className="btn-primary" onClick={capturePhoto}>Capture</button>
            )}
          </div>
          {cameraOn && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
              <video ref={videoRef} style={{width:'100%', background:'#000', border:'2px solid #1d4ed8', borderRadius:8}} playsInline muted />
              <canvas ref={canvasRef} style={{width:'100%', border:'2px dashed #1d4ed8', borderRadius:8}} />
            </div>
          )}
          <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create'}</button>
          {msg && <div style={{color:'#1d4ed8'}}>{msg}</div>}
        </form>
      )}
    </div>
  );
};


export default VendorDashboard;
