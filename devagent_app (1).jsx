import { useState, useEffect, useRef } from "react";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */
const MODES = [
  { id: "understand", label: "Code Understanding", icon: "🔍", color: "#00d4ff", desc: "Explain what code does" },
  { id: "debug",      label: "Debugging",          icon: "🐛", color: "#ff6b6b", desc: "Find & fix bugs"       },
  { id: "docs",       label: "Documentation",      icon: "📄", color: "#00ffaa", desc: "Generate API docs"     },
  { id: "test",       label: "Test Generation",    icon: "✅", color: "#c084fc", desc: "Write test suites"     },
  { id: "refactor",   label: "Refactoring",        icon: "⚙️", color: "#fbbf24", desc: "Improve code quality"  },
];

const SAMPLE = {
  understand:`function fibonacci(n) {\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return b;\n}`,
  debug:`function calcAvg(nums) {\n  let sum = 0;\n  for (let i = 0; i <= nums.length; i++) {\n    sum += nums[i];\n  }\n  return sum / nums.length;\n}`,
  docs:`class EventEmitter {\n  constructor() { this.events = {}; }\n  on(event, fn) {\n    (this.events[event] = this.events[event] || []).push(fn);\n    return this;\n  }\n  emit(event, ...args) {\n    (this.events[event] || []).forEach(fn => fn(...args));\n    return this;\n  }\n}`,
  test:`function isPalindrome(str) {\n  const s = str.toLowerCase().replace(/[^a-z0-9]/g,'');\n  return s === s.split('').reverse().join('');\n}`,
  refactor:`function processData(d) {\n  var r = [];\n  for(var i=0;i<d.length;i++){\n    if(d[i]!=null){\n      var x = d[i].value * 2;\n      r.push({val:x, ok: x>10});\n    }\n  }\n  return r;\n}`,
};

const PROMPTS = {
  understand: c => `You are an expert code analyst. Analyze this code:\n1. **What it does** — concise summary\n2. **How it works** — step-by-step logic\n3. **Key concepts** — patterns/algorithms used\n4. **Watch-outs** — edge cases\n\n\`\`\`\n${c}\n\`\`\`\nUse markdown.`,
  debug:      c => `You are an expert debugger. Find bugs in this code:\n1. **Bugs Found** — list all bugs\n2. **Root Cause** — why each occurs\n3. **Fixed Code** — corrected version\n4. **Prevention** — future tips\n\n\`\`\`\n${c}\n\`\`\``,
  docs:       c => `Generate professional documentation:\n1. **Overview** — what this does\n2. **API Reference** — params, returns, types\n3. **Usage Examples** — practical examples\n4. **Notes** — caveats/requirements\n\n\`\`\`\n${c}\n\`\`\``,
  test:       c => `Generate a complete test suite:\n1. **Unit Tests** — test each function\n2. **Edge Cases** — boundary/null/empty inputs\n3. **Coverage Summary** — scenarios covered\n\nUse Jest/Vitest. Write descriptive test names.\n\`\`\`\n${c}\n\`\`\``,
  refactor:   c => `Refactor this code for:\n1. **Readability** — cleaner names/structure\n2. **Performance** — eliminate redundancy\n3. **Best Practices** — SOLID principles\n4. **Refactored Code** — complete improved version\n5. **Changes** — bullet list of what changed & why\n\n\`\`\`\n${c}\n\`\`\``,
};

const STATS = [
  { label: "Analyses Run",  value: "1,284", delta: "+12%", icon: "🔍", color: "#00d4ff" },
  { label: "Bugs Squashed", value: "347",   delta: "+8%",  icon: "🐛", color: "#ff6b6b" },
  { label: "Docs Generated",value: "892",   delta: "+21%", icon: "📄", color: "#00ffaa" },
  { label: "Tests Written", value: "2,610", delta: "+15%", icon: "✅", color: "#c084fc" },
];

/* ─────────────────────────── MARKDOWN ──────────────────────────── */
function MD({ text }) {
  const lines = text.split("\n");
  const els = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim(); const cl = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) { cl.push(lines[i]); i++; }
      els.push(<pre key={i} style={{ background:"#0a0f1a", border:"1px solid #1e293b", borderRadius:10, padding:"14px 16px", overflowX:"auto", margin:"10px 0", fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, lineHeight:1.65, color:"#e2e8f0" }}>{lang&&<div style={{color:"#475569",fontSize:10,marginBottom:6}}>{lang}</div>}<code>{cl.join("\n")}</code></pre>);
    } else if (l.startsWith("## ")) { els.push(<h3 key={i} style={{color:"#f1f5f9",fontSize:15,fontWeight:700,margin:"18px 0 6px",fontFamily:"'Syne',sans-serif"}}>{l.slice(3)}</h3>); }
    else if (l.startsWith("# "))  { els.push(<h2 key={i} style={{color:"#f1f5f9",fontSize:17,fontWeight:800,margin:"16px 0 8px",fontFamily:"'Syne',sans-serif"}}>{l.slice(2)}</h2>); }
    else if (l.startsWith("- ")||l.startsWith("• ")) { els.push(<div key={i} style={{display:"flex",gap:8,margin:"4px 0",paddingLeft:8}}><span style={{color:"#00d4ff",flexShrink:0}}>▸</span><span style={{color:"#94a3b8",lineHeight:1.65,fontSize:13.5}}>{l.slice(2)}</span></div>); }
    else if (/^\d+\.\s/.test(l)) { els.push(<div key={i} style={{display:"flex",gap:8,margin:"4px 0",paddingLeft:8}}><span style={{color:"#00d4ff",flexShrink:0,minWidth:20,fontWeight:700}}>{l.match(/^\d+/)[0]}.</span><span style={{color:"#94a3b8",lineHeight:1.65,fontSize:13.5}}>{l.replace(/^\d+\.\s/,"")}</span></div>); }
    else if (l.trim()==="") { els.push(<div key={i} style={{height:5}}/>); }
    else {
      const parts = l.split(/(\*\*.*?\*\*|`[^`]+`)/g);
      els.push(<p key={i} style={{margin:"4px 0",lineHeight:1.7,color:"#94a3b8",fontSize:13.5}}>{parts.map((p,j)=>p.startsWith("**")?<strong key={j} style={{color:"#e2e8f0"}}>{p.slice(2,-2)}</strong>:p.startsWith("`")?<code key={j} style={{background:"#1e293b",color:"#00d4ff",padding:"1px 6px",borderRadius:4,fontSize:12}}>{p.slice(1,-1)}</code>:p)}</p>);
    }
    i++;
  }
  return <div style={{fontFamily:"'DM Sans',sans-serif"}}>{els}</div>;
}

/* ─────────────────────────── PARTICLES ─────────────────────────── */
function Particles() {
  const dots = Array.from({length:28},(_,i)=>({
    x: Math.random()*100, y: Math.random()*100,
    s: 1+Math.random()*2.5, d: 4+Math.random()*14,
    delay: Math.random()*8, color: i%3===0?"#00d4ff":i%3===1?"#00ffaa":"#c084fc"
  }));
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      {dots.map((d,i)=>(
        <div key={i} style={{
          position:"absolute", left:`${d.x}%`, top:`${d.y}%`,
          width:d.s, height:d.s, borderRadius:"50%", background:d.color,
          opacity:0.4, animation:`floatDot ${d.d}s ease-in-out ${d.delay}s infinite alternate`,
          boxShadow:`0 0 ${d.s*3}px ${d.color}`
        }}/>
      ))}
      <style>{`@keyframes floatDot{from{transform:translateY(0) scale(1)}to{transform:translateY(-30px) scale(1.4)}}`}</style>
    </div>
  );
}

/* ─────────────────────────── GRID BG ───────────────────────────── */
function GridBg() {
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{
        position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(0,212,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.04) 1px,transparent 1px)",
        backgroundSize:"48px 48px",
      }}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,212,255,0.08) 0%,transparent 70%)"}}/>
      <div style={{position:"absolute",left:"-20%",top:"10%",width:"40%",height:"40%",background:"radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(40px)"}}/>
      <div style={{position:"absolute",right:"-10%",bottom:"10%",width:"35%",height:"35%",background:"radial-gradient(circle,rgba(192,132,252,0.07) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(40px)"}}/>
    </div>
  );
}

/* ─────────────────────────── AUTH PAGE ─────────────────────────── */
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // fake stored users
  const [users, setUsers] = useState([{ email:"demo@devagent.ai", password:"demo123", name:"Demo User" }]);

  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const submit = async () => {
    setErr(""); setLoading(true);
    await new Promise(r=>setTimeout(r,900));
    if (tab==="login") {
      const u = users.find(u=>u.email===form.email && u.password===form.password);
      if (!u) { setErr("Invalid email or password."); setShake(true); setTimeout(()=>setShake(false),500); setLoading(false); return; }
      onLogin(u);
    } else {
      if (!form.name||!form.email||!form.password) { setErr("All fields are required."); setShake(true); setTimeout(()=>setShake(false),500); setLoading(false); return; }
      if (form.password!==form.confirm) { setErr("Passwords don't match."); setShake(true); setTimeout(()=>setShake(false),500); setLoading(false); return; }
      if (users.find(u=>u.email===form.email)) { setErr("Email already registered."); setShake(true); setTimeout(()=>setShake(false),500); setLoading(false); return; }
      const newUser = {email:form.email,password:form.password,name:form.name};
      setUsers(u=>[...u,newUser]);
      onLogin(newUser);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#040810",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <GridBg/><Particles/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .auth-input{width:100%;background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:13px 16px;color:#f1f5f9;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:all 0.2s;}
        .auth-input:focus{border-color:rgba(0,212,255,0.5);background:rgba(0,212,255,0.04);box-shadow:0 0 0 3px rgba(0,212,255,0.08);}
        .auth-input::placeholder{color:#475569;}
        .auth-tab{flex:1;padding:10px;background:transparent;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;transition:all 0.2s;border-radius:10px;}
        .auth-btn{width:100%;padding:14px;background:linear-gradient(135deg,#00d4ff,#0099cc);border:none;border-radius:12px;color:#040810;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.3px;}
        .auth-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,212,255,0.35);}
        .auth-btn:disabled{opacity:0.6;cursor:not-allowed;}
        @keyframes shakeX{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .card-in{animation:slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        .shake{animation:shakeX 0.4s ease;}
        .demo-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:999px;padding:5px 12px;font-size:11.5px;color:#00d4ff;cursor:pointer;transition:all 0.18s;font-family:'JetBrains Mono',monospace;}
        .demo-pill:hover{background:rgba(0,212,255,0.15);}
      `}</style>

      {/* Brand top */}
      <div style={{position:"absolute",top:24,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:10,zIndex:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#00d4ff,#0099cc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 20px rgba(0,212,255,0.4)"}}>🤖</div>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.5px"}}>DevAgent <span style={{color:"#00d4ff"}}>AI</span></span>
      </div>

      {/* Card */}
      <div className={`card-in ${shake?"shake":""}`} style={{
        width:"100%", maxWidth:420, margin:"80px 16px 16px",
        background:"rgba(255,255,255,0.03)",
        backdropFilter:"blur(24px)",
        border:"1.5px solid rgba(255,255,255,0.08)",
        borderRadius:24, padding:36,
        boxShadow:"0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(0,212,255,0.05) inset",
        position:"relative", overflow:"hidden",
      }}>
        {/* glow top */}
        <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",width:200,height:80,background:"radial-gradient(ellipse,rgba(0,212,255,0.15) 0%,transparent 70%)",filter:"blur(8px)",pointerEvents:"none"}}/>

        {/* Headline */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.8px",lineHeight:1.2}}>
            {tab==="login"?"Welcome back 👋":"Create account ✨"}
          </h1>
          <p style={{color:"#475569",fontSize:13.5,marginTop:6,fontFamily:"'DM Sans',sans-serif"}}>
            {tab==="login"?"Sign in to your DevAgent workspace":"Join thousands of developers using AI"}
          </p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.03)",borderRadius:12,padding:4,marginBottom:24,border:"1px solid rgba(255,255,255,0.06)"}}>
          {["login","signup"].map(t=>(
            <button key={t} className="auth-tab" onClick={()=>{setTab(t);setErr("");setForm({name:"",email:"",password:"",confirm:""});}}
              style={{color:tab===t?"#040810":"#64748b",background:tab===t?"#00d4ff":"transparent",boxShadow:tab===t?"0 2px 8px rgba(0,212,255,0.3)":"none"}}>
              {t==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          {tab==="signup"&&(
            <div>
              <label style={{fontSize:12,color:"#64748b",fontFamily:"'DM Sans',sans-serif",fontWeight:500,display:"block",marginBottom:6}}>FULL NAME</label>
              <input className="auth-input" placeholder="John Doe" value={form.name} onChange={upd("name")}/>
            </div>
          )}
          <div>
            <label style={{fontSize:12,color:"#64748b",fontFamily:"'DM Sans',sans-serif",fontWeight:500,display:"block",marginBottom:6}}>EMAIL ADDRESS</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={form.email} onChange={upd("email")}/>
          </div>
          <div>
            <label style={{fontSize:12,color:"#64748b",fontFamily:"'DM Sans',sans-serif",fontWeight:500,display:"block",marginBottom:6}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input className="auth-input" type={showPass?"text":"password"} placeholder="••••••••" value={form.password} onChange={upd("password")} style={{paddingRight:44}}/>
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#475569",fontSize:16}}>{showPass?"🙈":"👁️"}</button>
            </div>
          </div>
          {tab==="signup"&&(
            <div>
              <label style={{fontSize:12,color:"#64748b",fontFamily:"'DM Sans',sans-serif",fontWeight:500,display:"block",marginBottom:6}}>CONFIRM PASSWORD</label>
              <input className="auth-input" type="password" placeholder="••••••••" value={form.confirm} onChange={upd("confirm")}/>
            </div>
          )}
        </div>

        {/* Error */}
        {err&&<div style={{marginTop:14,padding:"10px 14px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:10,color:"#ff6b6b",fontSize:13,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8}}>⚠️ {err}</div>}

        {/* Submit */}
        <button className="auth-btn" onClick={submit} disabled={loading} style={{marginTop:20}}>
          {loading
            ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:16,height:16,borderRadius:"50%",border:"2px solid #04081066",borderTop:"2px solid #040810",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Processing…</span>
            : tab==="login"?"Sign In →":"Create Account →"}
        </button>

        {/* Demo */}
        {tab==="login"&&(
          <div style={{textAlign:"center",marginTop:16}}>
            <span style={{fontSize:12,color:"#475569",fontFamily:"'DM Sans',sans-serif"}}>Try it instantly — </span>
            <button className="demo-pill" onClick={()=>{setForm({...form,email:"demo@devagent.ai",password:"demo123"})}}>
              ⚡ Use demo credentials
            </button>
          </div>
        )}

        {/* Features strip */}
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:24,paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          {["🔍 Analyze","🐛 Debug","📄 Document","✅ Test"].map(f=>(
            <span key={f} style={{fontSize:11.5,color:"#334155",fontFamily:"'DM Sans',sans-serif"}}>{f}</span>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function Dashboard({ user, onLogout }) {
  const [activeMode, setActiveMode] = useState(MODES[0]);
  const [code, setCode] = useState(SAMPLE["understand"]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [sideOpen, setSideOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("agent");
  const outputRef = useRef(null);

  useEffect(()=>{ if(outputRef.current) outputRef.current.scrollTop=outputRef.current.scrollHeight; },[output]);

  const selectMode = m => { setActiveMode(m); setCode(SAMPLE[m.id]); setOutput(""); };

  const runAgent = async () => {
    if (!code.trim()) return;
    setLoading(true); setOutput("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{role:"user",content:PROMPTS[activeMode.id](code)}] })
      });
      const data = await res.json();
      const txt = data.content?.map(b=>b.text||"").join("")||"No response.";
      setOutput(txt);
      setHistory(h=>[{mode:activeMode.label,icon:activeMode.icon,time:new Date().toLocaleTimeString(),ok:true},...h].slice(0,10));
    } catch {
      setOutput("⚠️ Connection error. Please try again.");
      setHistory(h=>[{mode:activeMode.label,icon:activeMode.icon,time:new Date().toLocaleTimeString(),ok:false},...h].slice(0,10));
    }
    setLoading(false);
  };

  const initials = user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  return (
    <div style={{display:"flex",height:"100vh",background:"#040810",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0a0f1a}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all 0.18s;border:1px solid transparent;font-size:13.5px;font-weight:500;}
        .nav-item:hover{background:rgba(255,255,255,0.04);}
        .nav-item.active{background:rgba(0,212,255,0.08);border-color:rgba(0,212,255,0.15);color:#00d4ff;}
        .mode-card{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;cursor:pointer;transition:all 0.18s;border:1px solid transparent;}
        .mode-card:hover{background:rgba(255,255,255,0.04);}
        .stat-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px 20px;transition:all 0.2s;}
        .stat-card:hover{background:rgba(255,255,255,0.05);transform:translateY(-2px);}
        .run-btn{transition:all 0.2s;cursor:pointer;}
        .run-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.1);}
        .run-btn:disabled{opacity:0.55;cursor:not-allowed;}
        textarea{resize:none;outline:none;}
        textarea:focus{border-color:rgba(0,212,255,0.35)!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,0.4)}70%{box-shadow:0 0 0 8px rgba(0,212,255,0)}}
        .out-fade{animation:fadeUp 0.3s ease}
        .hist-row{padding:8px 10px;border-radius:8px;transition:background 0.15s;}
        .hist-row:hover{background:rgba(255,255,255,0.03);}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: sideOpen?240:64, flexShrink:0,
        background:"#070d18",
        borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column",
        transition:"width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow:"hidden", position:"relative", zIndex:10,
      }}>
        {/* Logo */}
        <div style={{padding:"18px 14px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#00d4ff,#0099cc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 16px rgba(0,212,255,0.35)",flexShrink:0}}>🤖</div>
          {sideOpen&&<span style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.5px",whiteSpace:"nowrap"}}>DevAgent <span style={{color:"#00d4ff"}}>AI</span></span>}
          <button onClick={()=>setSideOpen(s=>!s)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#475569",fontSize:18,flexShrink:0,lineHeight:1}}>
            {sideOpen?"‹":"›"}
          </button>
        </div>

        {/* Nav */}
        <div style={{padding:"12px 10px",flex:1,overflow:"auto"}}>
          {sideOpen&&<div style={{fontSize:10,color:"#334155",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",padding:"0 4px",marginBottom:8}}>Navigation</div>}
          {[
            {id:"dashboard",icon:"⊞",label:"Dashboard"},
            {id:"agent",icon:"🤖",label:"AI Agent"},
            {id:"history",icon:"🕘",label:"History"},
          ].map(n=>(
            <div key={n.id} className={`nav-item${activeNav===n.id?" active":""}`} onClick={()=>setActiveNav(n.id)}
              style={{color:activeNav===n.id?"#00d4ff":"#64748b",justifyContent:sideOpen?"flex-start":"center"}}>
              <span style={{fontSize:16,flexShrink:0}}>{n.icon}</span>
              {sideOpen&&<span>{n.label}</span>}
            </div>
          ))}

          {sideOpen&&activeNav==="agent"&&(
            <>
              <div style={{fontSize:10,color:"#334155",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",padding:"16px 4px 8px"}}>Capabilities</div>
              {MODES.map(m=>(
                <div key={m.id} className="mode-card" onClick={()=>selectMode(m)}
                  style={{background:activeMode.id===m.id?`${m.color}11`:"transparent", borderColor:activeMode.id===m.id?`${m.color}33`:"transparent"}}>
                  <span style={{fontSize:16}}>{m.icon}</span>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:activeMode.id===m.id?m.color:"#94a3b8"}}>{m.label}</div>
                    <div style={{fontSize:11,color:"#334155",marginTop:1}}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* User */}
        <div style={{padding:"12px 10px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.03)"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#c084fc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#040810",flexShrink:0}}>{initials}</div>
            {sideOpen&&(
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
                <div style={{fontSize:11,color:"#334155",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
              </div>
            )}
            {sideOpen&&<button onClick={onLogout} title="Logout" style={{background:"none",border:"none",cursor:"pointer",color:"#475569",fontSize:15,flexShrink:0,lineHeight:1}}>⏻</button>}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Topbar */}
        <div style={{
          padding:"0 24px", height:58,
          background:"rgba(7,13,24,0.9)",
          backdropFilter:"blur(12px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0,
        }}>
          <div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:"#f1f5f9",letterSpacing:"-0.3px"}}>
              {activeNav==="dashboard"?"Overview":activeNav==="agent"?"AI Agent":"Run History"}
            </h2>
            <p style={{fontSize:11.5,color:"#334155",marginTop:1}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:999,padding:"5px 12px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#00ffaa",boxShadow:"0 0 6px #00ffaa",animation:"pulse2 2s infinite"}}/>
              <span style={{fontSize:11.5,color:"#00d4ff",fontWeight:600}}>AI Online</span>
            </div>
            <button onClick={onLogout} style={{background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:8,padding:"6px 12px",color:"#ff6b6b",fontSize:12.5,fontWeight:600,cursor:"pointer",transition:"all 0.18s",fontFamily:"'DM Sans',sans-serif"}}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>

          {/* ── DASHBOARD TAB ── */}
          {activeNav==="dashboard"&&(
            <div style={{animation:"fadeUp 0.35s ease"}}>
              {/* Welcome */}
              <div style={{
                background:"linear-gradient(135deg,rgba(0,212,255,0.08),rgba(192,132,252,0.08))",
                border:"1px solid rgba(0,212,255,0.15)",
                borderRadius:18, padding:"24px 28px", marginBottom:20,
                position:"relative", overflow:"hidden",
              }}>
                <div style={{position:"absolute",right:-20,top:-20,width:140,height:140,background:"radial-gradient(circle,rgba(0,212,255,0.12) 0%,transparent 70%)",borderRadius:"50%"}}/>
                <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.5px"}}>
                  Good {new Date().getHours()<12?"morning":"afternoon"}, {user.name.split(" ")[0]}! 👋
                </h3>
                <p style={{color:"#64748b",fontSize:14,marginTop:6}}>Your AI development assistant is ready. Let's build something great today.</p>
                <button onClick={()=>setActiveNav("agent")} style={{marginTop:14,background:"linear-gradient(135deg,#00d4ff,#0099cc)",border:"none",borderRadius:10,padding:"10px 20px",color:"#040810",fontSize:13.5,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",transition:"all 0.2s",boxShadow:"0 4px 20px rgba(0,212,255,0.3)"}}>
                  Start Coding →
                </button>
              </div>
              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
                {STATS.map((s,i)=>(
                  <div key={i} className="stat-card" style={{animationDelay:`${i*0.07}s`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <span style={{fontSize:22}}>{s.icon}</span>
                      <span style={{fontSize:11,color:"#00ffaa",fontWeight:600,background:"rgba(0,255,170,0.08)",padding:"2px 8px",borderRadius:999}}>{s.delta}</span>
                    </div>
                    <div style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:"'Syne',sans-serif",letterSpacing:"-1px"}}>{s.value}</div>
                    <div style={{fontSize:12,color:"#475569",marginTop:4}}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Quick actions */}
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:20}}>
                <h4 style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#94a3b8",marginBottom:14,letterSpacing:"-0.2px"}}>Quick Actions</h4>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                  {MODES.map(m=>(
                    <button key={m.id} onClick={()=>{setActiveMode(m);setCode(SAMPLE[m.id]);setOutput("");setActiveNav("agent");}}
                      style={{background:`${m.color}0d`,border:`1px solid ${m.color}25`,borderRadius:12,padding:"14px 10px",cursor:"pointer",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                      <span style={{fontSize:22}}>{m.icon}</span>
                      <span style={{fontSize:11.5,color:m.color,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AGENT TAB ── */}
          {activeNav==="agent"&&(
            <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 98px)",animation:"fadeUp 0.3s ease"}}>
              {/* Mode bar */}
              <div style={{
                padding:"12px 18px", marginBottom:14,
                background:`${activeMode.color}08`,
                border:`1px solid ${activeMode.color}20`,
                borderRadius:14,
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:10,background:`${activeMode.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:`1px solid ${activeMode.color}30`}}>{activeMode.icon}</div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:activeMode.color,fontFamily:"'Syne',sans-serif"}}>{activeMode.label}</div>
                    <div style={{fontSize:12,color:"#475569",marginTop:2}}>{activeMode.desc}</div>
                  </div>
                </div>
                <button className="run-btn" onClick={runAgent} disabled={loading||!code.trim()}
                  style={{background:loading?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${activeMode.color},${activeMode.color}bb)`,
                    border:"none",borderRadius:10,padding:"10px 22px",color:loading?"#475569":"#040810",
                    fontSize:13.5,fontWeight:700,display:"flex",alignItems:"center",gap:8,
                    fontFamily:"'Syne',sans-serif",boxShadow:loading?"none":`0 4px 20px ${activeMode.color}40`}}>
                  {loading
                    ? <><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid #47556944",borderTop:"2px solid #64748b",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Analyzing…</>
                    : <>▶ Run Agent</>}
                </button>
              </div>

              {/* Editor + Output */}
              <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1.1fr",gap:14,overflow:"hidden"}}>
                {/* Editor */}
                <div style={{display:"flex",flexDirection:"column",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#ff6b6b"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#fbbf24"}}/>
                    <div style={{width:10,height:10,borderRadius:"50%",background:"#00ffaa"}}/>
                    <span style={{fontSize:11,color:"#334155",marginLeft:8,fontFamily:"'JetBrains Mono',monospace"}}>input.js</span>
                    <span style={{marginLeft:"auto",fontSize:11,color:"#1e293b"}}>{code.length} chars</span>
                  </div>
                  <div style={{flex:1,position:"relative"}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:40,background:"rgba(0,0,0,0.15)",borderRight:"1px solid rgba(255,255,255,0.04)",padding:"14px 0",overflow:"hidden",userSelect:"none"}}>
                      {code.split("\n").map((_,i)=>(
                        <div key={i} style={{fontSize:11,color:"#1e293b",textAlign:"right",paddingRight:8,lineHeight:"21px",fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div>
                      ))}
                    </div>
                    <textarea value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}
                      style={{position:"absolute",inset:0,paddingLeft:52,paddingTop:14,paddingRight:14,paddingBottom:14,
                        background:"transparent",border:"none",color:"#e2e8f0",
                        fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,lineHeight:"21px"}}/>
                  </div>
                </div>

                {/* Output */}
                <div style={{display:"flex",flexDirection:"column",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"#334155",fontFamily:"'JetBrains Mono',monospace"}}>agent_output.md</span>
                    {output&&<><div style={{width:7,height:7,borderRadius:"50%",background:"#00ffaa",marginLeft:4}}/>
                    <span style={{fontSize:10.5,color:"#00ffaa",fontWeight:600}}>Complete</span></>}
                  </div>
                  <div ref={outputRef} style={{flex:1,padding:"16px 18px",overflowY:"auto"}}>
                    {loading&&!output&&(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16}}>
                        <div style={{position:"relative",width:56,height:56}}>
                          <div style={{width:56,height:56,borderRadius:"50%",border:`3px solid ${activeMode.color}22`,borderTop:`3px solid ${activeMode.color}`,animation:"spin 0.8s linear infinite"}}/>
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{activeMode.icon}</div>
                        </div>
                        <div style={{fontSize:13.5,color:"#475569",textAlign:"center"}}>AI agent analyzing your code…</div>
                      </div>
                    )}
                    {!loading&&!output&&(
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,opacity:0.4}}>
                        <span style={{fontSize:40}}>{activeMode.icon}</span>
                        <p style={{fontSize:13.5,color:"#475569",textAlign:"center"}}>Paste your code and click<br/><strong style={{color:activeMode.color}}>Run Agent</strong></p>
                      </div>
                    )}
                    {output&&<div className="out-fade"><MD text={output}/></div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeNav==="history"&&(
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <h4 style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:"#94a3b8"}}>Run History</h4>
                  <span style={{fontSize:12,color:"#334155"}}>{history.length} runs</span>
                </div>
                {history.length===0?(
                  <div style={{padding:"60px 20px",textAlign:"center",color:"#334155",fontSize:14}}>
                    <div style={{fontSize:36,marginBottom:12}}>🕘</div>
                    No runs yet. Head to the AI Agent tab to get started!
                  </div>
                ):(
                  <div style={{padding:"8px"}}>
                    {history.map((h,i)=>(
                      <div key={i} className="hist-row" style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:18}}>{h.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13.5,fontWeight:500,color:"#e2e8f0"}}>{h.mode}</div>
                          <div style={{fontSize:11.5,color:"#334155",marginTop:2}}>{h.time}</div>
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:h.ok?"#00ffaa":"#ff6b6b",background:h.ok?"rgba(0,255,170,0.08)":"rgba(255,107,107,0.08)",padding:"3px 10px",borderRadius:999}}>{h.ok?"✓ Success":"✗ Failed"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── APP ROOT ──────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const handleLogin = (u) => setUser(u);
  const handleLogout = async () => {
    setLeaving(true);
    await new Promise(r=>setTimeout(r,300));
    setUser(null); setLeaving(false);
  };

  return (
    <div style={{opacity:leaving?0:1,transition:"opacity 0.3s"}}>
      {!user ? <AuthPage onLogin={handleLogin}/> : <Dashboard user={user} onLogout={handleLogout}/>}
    </div>
  );
}
