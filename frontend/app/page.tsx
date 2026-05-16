'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '94XXXXXXXXX';

type Vehicle = {
  id: string; name: string; type: string; plate: string;
  imageUrl: string; pricePerKm: number; pricePerDay: number;
};

const C = {
  bg:        '#131313',
  surface:   '#131313',
  surfaceLow:'#1c1b1b',
  surfaceC:  '#201f1f',
  surfaceCH: '#2a2a2a',
  surfaceCLo:'#0e0e0e',
  gold:      '#F5C518',
  onGold:    '#241a00',
  onSurface: '#e5e2e1',
  onVariant: '#d1c5ac',
  outline:   '#9a9078',
  outlineV:  '#4e4633',
};

export default function LandingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/vehicles/landing`).then(r => setVehicles(r.data)).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi! I would like to rent a vehicle. Please assist me.')}`;

  return (
    <>
      {/* ── NAVBAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(9,9,11,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.outlineV}`,
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          width:'100%', padding:'1rem 1.5rem', maxWidth:'1280px', margin:'0 auto' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <img src="/logo.webp" alt="Gasith" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <span style={{ fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:'1.25rem',
              letterSpacing:'-0.02em', textTransform:'uppercase', color: C.gold }}>
              GASITH RENT A CAR
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{ display:'flex', alignItems:'center', gap:'2rem',
            fontFamily:'Inter,sans-serif', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.1em' }}>
            {[['Home','#'],['Fleet','#fleet'],['How It Works','#how'],['Pricing','#pricing']].map(([label, href]) => (
              <a key={label} href={href}
                style={{ color: label === 'Home' ? C.gold : C.onVariant, fontWeight: label === 'Home' ? 700 : 500,
                  transition:'color 0.2s', textDecoration:'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = label === 'Home' ? C.gold : C.onVariant)}>
                {label}
              </a>
            ))}
          </nav>

          {/* Book Now */}
          <a href={waHref} target="_blank"
            className="desktop-nav"
            style={{ background: C.gold, color: C.onGold, padding:'0.625rem 1.5rem',
              borderRadius:'4px', fontFamily:'Inter,sans-serif', fontWeight:900,
              textTransform:'uppercase', fontSize:'0.75rem', letterSpacing:'-0.02em',
              textDecoration:'none', transition:'transform 0.2s', display:'inline-block' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            Book Now
          </a>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn"
            style={{ background:'none', border:'none', color:'#fff', fontSize:'1.5rem', cursor:'pointer' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: C.surfaceLow, borderTop:`1px solid ${C.outlineV}`,
            padding:'1rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[['Fleet','#fleet'],['How It Works','#how'],['Pricing','#pricing']].map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)}
                style={{ color: C.onVariant, padding:'0.5rem 0', fontSize:'0.95rem',
                  borderBottom:`1px solid ${C.outlineV}`, textDecoration:'none' }}>{label}</a>
            ))}
            <a href={waHref} target="_blank"
              style={{ background: C.gold, color: C.onGold, padding:'0.75rem',
                borderRadius:'4px', textAlign:'center', fontWeight:700, textDecoration:'none' }}>
              Book Now via WhatsApp
            </a>
          </div>
        )}
      </header>

      {/* SECTIONS WILL BE ADDED BELOW */}

      {/* ── HERO ── */}
      <section style={{ position:'relative', minHeight:'751px', display:'flex',
        alignItems:'center', overflow:'hidden' }}>
        {/* Background image */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDa4BT0nfVcXdsrd9YLmfU7jlxHYFi9c64-WmRn_XuHLzhq97nSqWE4rgBwzllaL9whB_oPWodMu8zHL2eSmZS27ww0MBwsV1o4BHCh83sjyLGTrGOIHHih_bhtUbJ0jClAbO86PAfW6DmpbYKze21RcGmjj_PjUwMx-s114UYa3f2yofXmyNlyXbhuztzx5hBVRQOzHNhOInx0NmpNC2R39hZW9mV0FdIUTl8u68N60nyXGTrgc2QHeigcZS4Zd8UVkyTnWj5SQb8"
            alt="Premium car"
            style={{ width:'100%', height:'100%', objectFit:'cover', filter:'brightness(0.3)' }}
          />
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(to right, #131313 0%, rgba(19,19,19,0.6) 50%, transparent 100%)' }} />
        </div>

        {/* Content */}
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'5rem 1.5rem',
          position:'relative', zIndex:10 }}>
          <div style={{ maxWidth:'640px' }}>
            <h1 style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'clamp(2.2rem,5vw,3rem)',
              lineHeight:1.1, letterSpacing:'-0.02em', color: C.onSurface, marginBottom:'1rem' }}>
              Rent Your Perfect Ride in Minutes
            </h1>
            <p style={{ fontSize:'1.125rem', lineHeight:1.6, color: C.onVariant,
              maxWidth:'32rem', marginBottom:'3rem' }}>
              Experience premium convenience. High-end rentals with transparent pricing and
              zero-friction WhatsApp booking — across Sri Lanka.
            </p>

            {/* CTA buttons */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'1rem' }}>
              <a href={waHref} target="_blank"
                style={{ background: C.gold, color: C.onGold, padding:'1.25rem 2rem',
                  borderRadius:'8px', fontFamily:'Inter,sans-serif', fontWeight:700,
                  fontSize:'1rem', display:'flex', alignItems:'center', gap:'0.75rem',
                  textDecoration:'none', boxShadow:`0 20px 40px rgba(245,197,24,0.2)`,
                  transition:'filter 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
                <span className="material-symbols-outlined">chat</span>
                Book via WhatsApp
              </a>
              <a href="#fleet"
                style={{ border:`1px solid ${C.outline}`, color: C.onSurface,
                  padding:'1.25rem 2rem', borderRadius:'8px', fontFamily:'Inter,sans-serif',
                  fontWeight:700, fontSize:'1rem', textDecoration:'none', transition:'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                View Our Fleet
              </a>
            </div>

            {/* Avatar trust row */}
            <div style={{ marginTop:'3rem', display:'flex', alignItems:'center', gap:'1.5rem' }}>
              <div style={{ display:'flex' }}>
                {[
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDyP4IIhq_j0gMSLKsjZ7WefygtZrrWijJgicBvgHOdl60deAjTxntak7pXlyCdVXNxLKfTEbvs_oNFzjTqFLuGgIl-RxsdVvp9-KcqgM2bCCe07IM7GSWPJ7epnqNorOIH5J28vsccsy_1hevD31EiwJEzRFy3wQNMcbmb0LsjHP3N-MlsHcwVKNmU9rbHKaILS04AhbWxT4Jq5ArXlEvP9a8Zf6V_E6RFSxcIXMIvD_Bh3WIgTj9Img7s43IRoYlLoUjQfVIWmPs',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBhoRKsWtmxMYUr-bCRIFr6NOQxkBVb2g0WIDiYvMnbthhp_k_xFWvxFRJWmx5_8pj_hB4qXVWWPGnUXggR-sTOIAs2NbzE_WYkFJxFpWxWjne4TIa_Rd3PjsAeI-fEzXEfJXgOk0qxb66wUiaJjL3FoZY66JJ9i5bJ81X8BtfTkbJdhmu6-Z5J6RHV-ied05dnywnrMonRmzdFRf-oXxJEv68tVHju-3Xq8ocJvStifPeNxm9irZDLPsKaId-9et6P0RsDAbqC6G0',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBgrdywI_KEiFZ8EkwfrWCLwU4n6EqtVWu_VLXS6utO0znTcNUP-ek2JgqAqWqJIdKqROREvZcwnT4y2Zm7wJ7hJGxMMFX4MzYPqyDiTOo55slVCTAr_mWdjLoT6gYs7WqYs9IZB1Ci07FPNudJTXpg73IYVWummet10ZGG77otMmxAxQkCETlclQEbeyg4IBopfMJ54L9Xe_AwJlBhjF9uJvT5Ao_w-Y-ViE2VHhwL47MaEdaaVJxY--qrqeke1DJAQBXP6YkxePQ',
                ].map((src, i) => (
                  <div key={i} style={{ width:'2.5rem', height:'2.5rem', borderRadius:'50%',
                    border:`2px solid ${C.surface}`, background: C.surfaceCH, overflow:'hidden',
                    marginLeft: i > 0 ? '-0.75rem' : 0 }}>
                    <img src={src} alt="Customer" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
              </div>
              <span style={{ fontFamily:'Work Sans,sans-serif', fontSize:'0.75rem', fontWeight:600,
                color: C.onVariant, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Trusted by 5,000+ Drivers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FLEET ── */}
      <section id="fleet" style={{ padding:'5rem 0', background: C.surface }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'3rem' }}>
            <div>
              <span style={{ color: C.gold, fontFamily:'Work Sans,sans-serif', fontSize:'0.75rem',
                fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Our Fleet</span>
              <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'2rem',
                lineHeight:1.2, letterSpacing:'-0.01em', color: C.onSurface, marginTop:'0.25rem' }}>
                Choose Your Drive
              </h2>
            </div>
            <a href="#" style={{ color: C.onVariant, fontSize:'0.75rem', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'0.08em', textDecoration:'none',
              display:'flex', alignItems:'center', gap:'0.5rem', transition:'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.onVariant)}>
              View All <span className="material-symbols-outlined" style={{ fontSize:'1rem' }}>arrow_forward</span>
            </a>
          </div>

          {/* Cards */}
          {vehicles.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1.25rem' }}>
              {vehicles.map(v => (
                <div key={v.id} style={{ background: C.surfaceC, borderRadius:'12px', overflow:'hidden',
                  transition:'all 0.3s', cursor:'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 25px 50px rgba(0,0,0,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div style={{ aspectRatio:'4/3', overflow:'hidden', background:'#1a1a1a' }}>
                    {v.imageUrl
                      ? <img src={v.imageUrl} alt={v.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }}>🚗</div>
                    }
                  </div>
                  <div style={{ padding:'1rem' }}>
                    <h3 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'1.5rem', color: C.onSurface }}>{v.name}</h3>
                    <p style={{ color: C.onVariant, fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1.5rem' }}>{v.type}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:'0.75rem', color: C.onVariant, display:'block' }}>Starting from</span>
                        <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'1.75rem', color: C.gold }}>
                          LKR {v.pricePerDay?.toLocaleString()}<span style={{ fontSize:'0.875rem', fontWeight:400, color: C.onVariant }}>/day</span>
                        </span>
                      </div>
                      <a href={`${waHref}&text=${encodeURIComponent(`Hi! I'm interested in renting the ${v.name}. Is it available?`)}`}
                        target="_blank"
                        style={{ background: C.gold, color: C.onGold, padding:'0.5rem 1rem',
                          borderRadius:'4px', fontSize:'0.8rem', fontWeight:700, textDecoration:'none' }}>
                        Rent
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback category cards */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.25rem' }}>
              {[
                { label:'Economy', desc:'Efficient, compact, and perfect for city commuting.', price:'LKR 8,000', icon:'local_gas_station',
                  img:'https://lh3.googleusercontent.com/aida-public/AB6AXuDbiOqRntqbh9sx6Fh9iL5qevXAN16nM3XJ0TK0aOPFh-XsD5QxXznsJcbIewQdhMqf-LYo1noylxhByyNCAtd0b5IGvznmOKeJ6HSZv8JfQJBmL_KXGIIxU3jHDiuPUlwvEczu8CGNhfKwITA6xVS9kvYVmNokhysXr9cupMJ6gg3sqLYB0o-3oaH5-lDwD_yMIYpPGT055zm2t4GivYCx3wsIWU2XSd7cOr0jPNICS40HU8T1hnMPDqDArA8OjgNreUXso5gUuXI' },
                { label:'Sedan', desc:'Executive comfort for business and leisure trips.', price:'LKR 12,000', icon:'settings',
                  img:'https://lh3.googleusercontent.com/aida-public/AB6AXuCMyLSSCom_3xOLZddhQ74AOd866CKPu4DQNmd61mtBDWeQ7t2EscQ0Hg22ygssgv14wsLR27qSnbEP9fPcZUgtjGHVNnzQ3r_VVmXgdvtfy7PA_jTU7DMOkgtJUe2oP65XW2bniCVCrUXdJInu1RQVTJ-ry9zAe0yvDRaVj52FasHxwlSlzXCfHfkxalosaFm7G8IXAuEuo3-L35yt08IYSFKlBwvprlpI9My6zwnpOK3-4Vv-_sN3_7YTfUfXesRG48hQBzOqEFM' },
                { label:'SUV', desc:'Command the road with power and ample space.', price:'LKR 18,000', icon:'groups',
                  img:'https://lh3.googleusercontent.com/aida-public/AB6AXuDlyKIs3xjkX2qIYDAL-xzYEDhs7nWzCe1odcYZbxr4pvB71YwpyT21czHVZvSZdxOssHAjZ2t9G4lOVI1EwfjaOEECMH3LsGsiMhEzNO5TgqHz16cEVrFHcryfubNEQhAUAboRNOyomXTrTs92r9v8Br-XG8MuM9kyyJP3uwzZTWCk9-T7UnQgyQ3oGEdssAy_i2v1QrQ5DNM1RMPvoCC1hW3r58iuyC5l2LGvk4AjKgJcEzkv2Q4NJo9EX2Qa6bqy7f6GZET2LYU' },
                { label:'Van', desc:'Perfect for groups and large family adventures.', price:'LKR 25,000', icon:'airport_shuttle',
                  img:'https://lh3.googleusercontent.com/aida-public/AB6AXuAqXo397vP1CQbnbcu3JQczpi9jkJ3PC7HhNjJnV1mR4Ow9m9lZoMOeAmF_AStzbq_coLGxKGIqh55XR7JVjtaqw_q6OquaHTKuM4jrtjG4BPp2CwlO3_dDBv96xkkUQ0uTDOf6rOSt-fB3vl0KD4dxjlfq5ZYUU6IISsrXdOPzalRwEqETwHUKNEQrIS_qIiz9DjwRca0mKeEiiz8ag7L41oZg3JSi7eAk7S_oMQQAlglFfM9ucMJDHLM8WWE0IghpyIeyK7hRuOA' },
              ].map(cat => (
                <div key={cat.label} style={{ background: C.surfaceC, borderRadius:'12px', overflow:'hidden',
                  transition:'all 0.3s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 25px 50px rgba(0,0,0,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                  <div style={{ aspectRatio:'4/3', overflow:'hidden', background:'#18181b' }}>
                    <img src={cat.img} alt={cat.label} style={{ width:'100%', height:'100%', objectFit:'cover',
                      transition:'transform 0.5s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  </div>
                  <div style={{ padding:'1rem' }}>
                    <h3 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'1.5rem', color: C.onSurface }}>{cat.label}</h3>
                    <p style={{ color: C.onVariant, fontSize:'0.875rem', marginTop:'0.25rem', marginBottom:'1.5rem' }}>{cat.desc}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:'0.75rem', color: C.onVariant, display:'block' }}>Starting from</span>
                        <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'1.75rem', color: C.gold }}>
                          {cat.price}<span style={{ fontSize:'0.875rem', fontWeight:400, color: C.onVariant }}>/day</span>
                        </span>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: C.surfaceCH, fontSize:'1.5rem' }}>{cat.icon}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding:'5rem 0', background: C.surfaceLow }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', maxWidth:'42rem', margin:'0 auto 3rem' }}>
            <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'2rem', color: C.onSurface }}>
              Rent in 3 Easy Steps
            </h2>
            <p style={{ color: C.onVariant, marginTop:'1rem' }}>
              The fastest way to get behind the wheel. No paperwork headaches, just simple communication.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'3rem', position:'relative' }}>
            {/* Connector line (hidden on mobile via JS-controlled style) */}
            <div style={{ position:'absolute', top:'2rem', left:'16.67%', right:'16.67%',
              height:'2px', background:'#27272a', zIndex:0 }} />
            {[
              { icon:'chat', title:'WhatsApp Contact', desc:'Send us a message. Our team is online 24/7 to assist you instantly.', active: true },
              { icon:'car_rental', title:'Choose Vehicle', desc:"Pick from our available fleet. We'll send you photos and specs via chat.", active: false },
              { icon:'verified', title:'Confirm & Pickup', desc:'Send your IDs, confirm the booking, and pick up your keys. Done.', active: false },
            ].map((step, i) => (
              <div key={i} style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center' }}>
                <div style={{
                  width:'4rem', height:'4rem', borderRadius:'50%', marginBottom:'1rem',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: step.active ? C.gold : C.surfaceCH,
                  border: step.active ? 'none' : `1px solid ${C.outline}`,
                  boxShadow: step.active ? `0 8px 20px rgba(245,197,24,0.3)` : 'none',
                }}>
                  <span className="material-symbols-outlined" style={{ color: step.active ? C.onGold : C.gold }}>{step.icon}</span>
                </div>
                <h4 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'1.5rem',
                  color: C.onSurface, marginBottom:'0.5rem' }}>{step.title}</h4>
                <p style={{ color: C.onVariant, fontSize:'0.875rem' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section style={{ padding:'5rem 0', background: C.surface }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'5rem', alignItems:'center' }}>
            {/* Left: features */}
            <div>
              <span style={{ color: C.gold, fontFamily:'Work Sans,sans-serif', fontSize:'0.75rem',
                fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Our Promise</span>
              <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'2rem', color: C.onSurface,
                marginTop:'0.25rem', marginBottom:'3rem' }}>Why Gasith Premium?</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1.5rem' }}>
                {[
                  { icon:'payments', title:'Affordable Pricing', desc:'Competitive rates without hidden surcharges or fees.' },
                  { icon:'calendar_month', title:'Flexible Payment', desc:'Multiple payment methods accepted including bank transfer.' },
                  { icon:'description', title:'Easy Documentation', desc:'Digital-first processing for a faster hand-over.' },
                  { icon:'speed', title:'Quick Process', desc:'Get your keys in under 15 minutes of arrival.' },
                ].map(item => (
                  <div key={item.title} style={{ display:'flex', gap:'1rem' }}>
                    <div style={{ flexShrink:0, width:'3rem', height:'3rem', borderRadius:'4px',
                      background: C.surfaceCH, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ color: C.gold }}>{item.icon}</span>
                    </div>
                    <div>
                      <h5 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, color: C.onSurface, marginBottom:'0.25rem' }}>{item.title}</h5>
                      <p style={{ fontSize:'0.875rem', color: C.onVariant }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right: image + badge */}
            <div style={{ position:'relative' }}>
              <div style={{ aspectRatio:'1/1', borderRadius:'16px', overflow:'hidden', boxShadow:'0 25px 50px rgba(0,0,0,0.5)' }}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2wXpUauE8CbfsGS9wnp4muAWYN9pvx-RwhzoKNS6mSKKwS54fz-qgaCBUmDHjl-pR325kYPHceyfZ0ZWXOkDm2BSKy16-oPbOYoYW44_VeKj2kthrLoAiy35DIlWSJmkpDsXKd5Pf-rD4cpKptbvlF-tuYLiRGI_XBkrpSfjh65R0Mbr6i4sfgBgiVGpihOPAQL1jSkSZhkqldrV8HbTZU729GyvRW7weewMW-1_4usbVyyVKe1N8Q3j6u27Ju3EgBMXy6u--P1I"
                  alt="Premium Interior"
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                />
              </div>
              {/* Rating badge */}
              <div className="glass-card" style={{ position:'absolute', bottom:'-1.5rem', left:'-1.5rem',
                padding:'1.5rem', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                  <div style={{ fontSize:'2.25rem', fontWeight:900, fontFamily:'Inter,sans-serif', color: C.gold }}>4.9</div>
                  <div>
                    <div style={{ display:'flex', color: C.gold, fontSize:'0.75rem' }}>
                      {'★★★★★'.split('').map((s,i) => <span key={i}>{s}</span>)}
                    </div>
                    <div style={{ fontSize:'0.75rem', color: C.onVariant, textTransform:'uppercase',
                      letterSpacing:'0.1em', fontWeight:700 }}>Google Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding:'5rem 0', background: C.surfaceCLo }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ maxWidth:'48rem', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'3rem' }}>
              <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'2rem', color: C.onSurface }}>
                Transparent Pricing
              </h2>
              <p style={{ color: C.onVariant, marginTop:'1rem' }}>
                No hidden costs. No surprises. Just clear rates for your journey.
              </p>
            </div>
            <div style={{ background: C.surfaceC, borderRadius:'16px', border:`1px solid ${C.outlineV}`, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
                borderBottom:`1px solid ${C.outlineV}` }}>
                {[
                  { icon:'event', title:'Base Day Rate', desc:'Includes full insurance and primary driver coverage.', price:'LKR 8,000' },
                  { icon:'add_road', title:'Per KM Rate', desc:'Only pay for what you drive beyond the 100km daily limit.', price:'LKR 30 / km' },
                ].map((item, i) => (
                  <div key={i} style={{ padding:'3rem', display:'flex', flexDirection:'column', alignItems:'center',
                    textAlign:'center', borderRight: i === 0 ? `1px solid ${C.outlineV}` : 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'2.5rem', color: C.gold, marginBottom:'1.5rem' }}>{item.icon}</span>
                    <h4 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'1.5rem', color: C.onSurface, marginBottom:'0.5rem' }}>{item.title}</h4>
                    <p style={{ fontSize:'0.875rem', color: C.onVariant, marginBottom:'1.5rem' }}>{item.desc}</p>
                    <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'1.75rem', color: C.onSurface }}>{item.price}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.gold, padding:'1rem', textAlign:'center' }}>
                <p style={{ color: C.onGold, fontWeight:700, fontSize:'0.875rem' }}>
                  Long-term rentals (7+ days) get 20% discount automatically!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding:'5rem 0', background: C.surface }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem' }}>
          <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'2rem',
            color: C.onSurface, textAlign:'center', marginBottom:'3rem' }}>
            What Our Drivers Say
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'3rem' }}>
            {[
              { quote:'"The WhatsApp booking is a game changer. I booked my SUV while at the airport and it was ready when I arrived. Highly recommended!"', name:'Mark Richardson', role:'Frequent Business Traveler' },
              { quote:'"No hidden fees at all. Paid exactly what was quoted on WhatsApp. The car was spotless and the staff were incredibly professional."', name:'Sarah J. Miller', role:'Tourist' },
            ].map(t => (
              <div key={t.name} style={{ background: C.surfaceC, padding:'3rem', borderRadius:'12px',
                borderLeft:`4px solid ${C.gold}` }}>
                <div style={{ display:'flex', color: C.gold, marginBottom:'1rem', fontSize:'1.2rem' }}>{'★★★★★'}</div>
                <p style={{ fontStyle:'italic', color: C.onVariant, marginBottom:'1.5rem' }}>{t.quote}</p>
                <div style={{ fontWeight:700, color: C.onSurface }}>{t.name}</div>
                <div style={{ fontSize:'0.75rem', color: C.outline, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'5rem 0', background: C.gold }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem', textAlign:'center' }}>
          <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'clamp(2rem,5vw,3rem)',
            color: C.onGold, letterSpacing:'-0.02em', marginBottom:'1rem' }}>
            Ready to Hit the Road?
          </h2>
          <p style={{ color: 'rgba(36,26,0,0.8)', fontSize:'1.125rem', lineHeight:1.6,
            maxWidth:'36rem', margin:'0 auto 3rem' }}>
            Skip the counter and the paperwork. Start your journey with a quick message to our team.
          </p>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1.5rem' }}>
            <a href={waHref} target="_blank"
              style={{ background:'#000', color:'#fff', padding:'1.5rem 2.5rem',
                borderRadius:'9999px', fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'1.25rem',
                display:'flex', alignItems:'center', gap:'1rem', textDecoration:'none',
                boxShadow:'0 25px 50px rgba(0,0,0,0.3)', transition:'transform 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              <span className="material-symbols-outlined">chat</span>
              WhatsApp Us Now
            </a>
            <div style={{ color: C.onGold }}>
              <div style={{ fontWeight:900, fontSize:'1.5rem' }}>+94 XX XXX XXXX</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem',
                marginTop:'0.5rem', opacity:0.7, fontSize:'0.75rem', textTransform:'uppercase',
                letterSpacing:'0.1em', fontWeight:700 }}>
                <span className="material-symbols-outlined" style={{ fontSize:'1rem' }}>location_on</span>
                Island-wide Sri Lanka
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#09090b', borderTop:`1px solid ${C.outlineV}` }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'3rem 1.5rem',
          display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.webp" alt="Gasith" style={{ width: 40, height: 40, borderRadius: 8 }} />
            <div>
              <div style={{ fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:'1.125rem',
                color:'#fff', marginBottom:'0.25rem' }}>GASITH RENT A CAR</div>
              <p style={{ fontFamily:'Inter,sans-serif', fontSize:'0.75rem', textTransform:'uppercase',
                letterSpacing:'0.1em', color:'#71717a', margin:0 }}>
                © {new Date().getFullYear()} Gasith Rent a Car. All rights reserved.
              </p>
            </div>
          </div>
          <nav style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>
            {[['Browse Fleet','#fleet'],['How It Works','#how'],['WhatsApp Support', waHref],['Admin Login','/login']].map(([label, href]) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                style={{ fontFamily:'Inter,sans-serif', fontSize:'0.75rem', textTransform:'uppercase',
                  letterSpacing:'0.1em', color:'#71717a', textDecoration:'none', transition:'color 0.3s' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
                onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>

      {/* ── WHATSAPP FAB ── */}
      <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        style={{ position:'fixed', bottom:'2rem', right:'2rem', width:'3.5rem', height:'3.5rem',
          background:'#25D366', borderRadius:'50%', display:'flex',
          alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 24px rgba(37,211,102,0.5)',
          zIndex:60, textDecoration:'none', transition:'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,211,102,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,211,102,0.5)'; }}>
        <i className="fa-brands fa-whatsapp" style={{ fontSize:'1.9rem', color:'#fff', lineHeight:1 }} />
      </a>

      {/* ── Mobile/Desktop nav CSS ── */}
      <style>{`
        @media (min-width: 768px) { .mobile-menu-btn { display: none !important; } .desktop-nav { display: flex !important; } }
        @media (max-width: 767px) { .desktop-nav { display: none !important; } .mobile-menu-btn { display: block !important; } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </>
  );
}
