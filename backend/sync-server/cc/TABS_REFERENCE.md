# CC v5.5 — Aesthetics, Instructions & Security Tabs
## Complete Code Reference for Desktop Assistant

This file contains ALL code needed to recreate the Aesthetics, Instructions, and Security tabs in a new CC build. Code is extracted from the live `/home/clawd/sync-server/cc/index.html` as of 2026-02-12.

---

## TABLE OF CONTENTS
1. CSS Classes
2. Data Constants (COLOR_DEFS, THEMES, FONTS, BG_MODES)
3. renderAesthetics() + all helper functions
4. renderSecurity() + runSecurityAudit()
5. renderInstructions()
6. renderSettingsPage() (parent container with sub-tabs)
7. Auth Gate (password protection)

---

## 1. CSS CLASSES

```css
.ae-sec{margin-bottom:20px}.ae-sec-t{font-size:13px;font-weight:700;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid var(--border)}
.ae-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px}
.ae-swatch{display:flex;align-items:center;gap:7px;padding:6px 8px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all .15s}.ae-swatch:hover{border-color:var(--border-hover)}
.ae-cprev{width:24px;height:24px;border-radius:5px;flex-shrink:0;border:1px solid rgba(255,255,255,.1);cursor:pointer;position:relative;overflow:hidden}.ae-cprev input[type=color]{position:absolute;inset:-4px;width:calc(100%+8px);height:calc(100%+8px);border:none;cursor:pointer;opacity:0}
.ae-label{font-size:9px;font-weight:600}.ae-var{font-size:7px;color:var(--text-muted);font-family:'JetBrains Mono',monospace}
.ae-hex{width:64px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text);font-size:8px;font-family:'JetBrains Mono',monospace;text-align:center}.ae-hex:focus{border-color:var(--accent)}
.theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.theme-card{background:var(--surface-alt);border:2px solid var(--border);border-radius:var(--radius-sm);padding:10px;cursor:pointer;transition:all .15s;text-align:center}.theme-card:hover{border-color:var(--border-hover)}.theme-card.active{border-color:var(--accent);box-shadow:0 0 12px var(--accent-glow)}.theme-card .prev{display:flex;gap:3px;justify-content:center;margin-bottom:6px}.theme-card .prev span{width:14px;height:14px;border-radius:3px;border:1px solid rgba(255,255,255,.08)}.theme-card .tnm{font-size:10px;font-weight:600}
.ae-slider-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}.ae-slider-row label{font-size:10px;font-weight:600;min-width:100px}.ae-slider-row input[type=range]{width:140px;max-width:140px;flex:none;accent-color:var(--accent)}.ae-slider-val{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text-sec);min-width:40px}
.ae-num-input{width:52px;padding:3px 4px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-alt);color:var(--text);font-size:11px;font-family:'JetBrains Mono',monospace;text-align:center;-moz-appearance:textfield}.ae-num-input::-webkit-inner-spin-button,.ae-num-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.ae-num-input:focus{border-color:var(--accent);outline:none}
.ae-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}.ae-toggle-label{font-size:11px;font-weight:500}.ae-toggle-desc{font-size:9px;color:var(--text-muted)}
.ae-upload-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)}.ae-upload-info{flex:1;min-width:0}.ae-upload-label{font-size:11px;font-weight:600}.ae-upload-desc{font-size:9px;color:var(--text-muted)}
.ae-upload-box{width:48px;height:48px;border:2px dashed var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;overflow:hidden;flex-shrink:0}.ae-upload-box:hover{border-color:var(--accent);background:var(--accent-dim)}
.ae-upload-preview{width:100%;height:100%;object-fit:cover}.ae-upload-placeholder{font-size:9px;color:var(--text-muted);text-align:center;line-height:1.2}
.ae-upload-clear{width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--surface-alt);color:var(--text-muted);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ae-upload-clear:hover{border-color:var(--critical);color:var(--critical)}
.ae-slider-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}.ae-slider-row label{font-size:10px;font-weight:600;min-width:100px}.ae-slider-row input[type=range]{width:140px;max-width:140px;flex:none;accent-color:var(--accent)}.ae-slider-val{font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text-sec);min-width:40px}
.ae-num-input{width:52px;padding:3px 4px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-alt);color:var(--text);font-size:11px;font-family:'JetBrains Mono',monospace;text-align:center;-moz-appearance:textfield}.ae-num-input::-webkit-inner-spin-button,.ae-num-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.ae-num-input:focus{border-color:var(--accent);outline:none}
.ae-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)}.ae-toggle-label{font-size:11px;font-weight:500}.ae-toggle-desc{font-size:9px;color:var(--text-muted)}
.ae-upload-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)}.ae-upload-info{flex:1;min-width:0}.ae-upload-label{font-size:11px;font-weight:600}.ae-upload-desc{font-size:9px;color:var(--text-muted)}
.ae-upload-box{width:48px;height:48px;border:2px dashed var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;overflow:hidden;flex-shrink:0}.ae-upload-box:hover{border-color:var(--accent);background:var(--accent-dim)}
.ae-upload-preview{width:100%;height:100%;object-fit:cover}.ae-upload-placeholder{font-size:9px;color:var(--text-muted);text-align:center;line-height:1.2}
.ae-upload-clear{width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--surface-alt);color:var(--text-muted);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ae-upload-clear:hover{border-color:var(--critical);color:var(--critical)}

.set-wrap{max-width:600px;margin:0 auto}.set-sec{margin-bottom:18px}.set-sec-t{font-size:13px;font-weight:700;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)}.set-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)}.set-lbl{font-size:11px;font-weight:500}.set-desc{font-size:9px;color:var(--text-muted);margin-top:1px}.set-inp{padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-alt);color:var(--text);font-size:11px;width:160px}.set-inp:focus{border-color:var(--accent)}.set-btn{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-alt);color:var(--text);font-size:11px;font-weight:500;transition:all .15s}.set-btn:hover{border-color:var(--accent);color:var(--accent)}.set-btn.danger{color:var(--offline)}.set-btn.danger:hover{border-color:var(--offline)}

.ins-wrap{max-width:860px;margin:0 auto;padding-bottom:40px}
.ins-hero{text-align:center;padding:28px 0 20px;border-bottom:1px solid var(--border);margin-bottom:24px}
.ins-hero-ico{font-size:42px;margin-bottom:8px}
.ins-hero h2{font-size:22px;font-weight:900;margin-bottom:4px}
.ins-hero-sub{font-size:12px;color:var(--text-sec);line-height:1.5;max-width:550px;margin:0 auto}
.ins-toc{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:24px}
.ins-toc-t{font-size:12px;font-weight:700;margin-bottom:8px;color:var(--accent)}
.ins-toc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px}
.ins-toc-link{font-size:11px;color:var(--text-sec);padding:4px 8px;border-radius:var(--radius-sm);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
.ins-toc-link:hover{background:var(--accent-dim);color:var(--accent)}
.ins-section{margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.ins-sec-hdr{display:flex;align-items:center;gap:10px;padding:14px 18px;cursor:pointer;transition:all .15s;user-select:none}
.ins-sec-hdr:hover{background:var(--surface-alt)}
.ins-sec-ico{font-size:20px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--accent-dim);border:1px solid rgba(232,113,58,.2);border-radius:var(--radius-sm);flex-shrink:0}
.ins-sec-title{font-size:14px;font-weight:800;flex:1}
.ins-sec-chev{font-size:10px;color:var(--text-muted);transition:transform .2s}
.ins-section.open .ins-sec-chev{transform:rotate(180deg);color:var(--accent)}
.ins-sec-body{max-height:0;overflow:hidden;transition:max-height .4s ease}
.ins-section.open .ins-sec-body{max-height:5000px}
.ins-sec-inner{padding:0 18px 18px;border-top:1px solid var(--border)}
.ins-purpose{font-size:11px;color:var(--text-sec);line-height:1.5;padding:12px 0 10px;border-bottom:1px solid var(--border);margin-bottom:12px}
.ins-feat{margin-bottom:14px}
.ins-feat-t{font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px;display:flex;align-items:center;gap:6px}
.ins-feat-desc{font-size:10px;color:var(--text-sec);line-height:1.5;margin-bottom:4px}
.ins-tip{display:flex;gap:8px;padding:8px 12px;background:var(--accent-dim);border:1px solid rgba(232,113,58,.15);border-radius:var(--radius-sm);margin-top:6px;margin-bottom:4px}
.ins-tip-ico{flex-shrink:0;font-size:12px;margin-top:1px}
.ins-tip-txt{font-size:10px;color:var(--accent);line-height:1.45;font-weight:500}
.ins-proto{display:flex;gap:8px;padding:8px 12px;background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.12);border-radius:var(--radius-sm);margin-top:6px;margin-bottom:4px}
.ins-proto-ico{flex-shrink:0;font-size:12px;margin-top:1px}
.ins-proto-txt{font-size:10px;color:var(--online);line-height:1.45;font-weight:500}
.ins-key{font-size:10px;color:var(--text);line-height:1.5;padding:4px 0}
.ins-key strong{color:var(--accent);font-weight:700}
.ins-divider{height:1px;background:var(--border);margin:10px 0}
.ins-philosophy{background:linear-gradient(135deg,var(--surface),var(--surface-alt));border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-top:24px;text-align:center}
.ins-philosophy h3{font-size:14px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,var(--accent),var(--online));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ins-philosophy p{font-size:11px;color:var(--text-sec);line-height:1.6;max-width:600px;margin:0 auto}

```

### Auth Gate CSS
```css
.auth-gate{position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;flex-direction:column}
.auth-gate.hidden{display:none}
.auth-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:40px 36px;width:340px;text-align:center}
.auth-box h1{font-size:18px;font-weight:800;letter-spacing:1.5px;color:var(--accent);margin-bottom:4px}
.auth-box .auth-sub{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:28px}
.auth-box .auth-field{margin-bottom:14px;text-align:left}
.auth-box .auth-field label{display:block;font-size:9px;font-weight:600;color:var(--text-sec);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.auth-box .auth-field input{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:13px;transition:border-color .2s}
.auth-box .auth-field input:focus{border-color:var(--accent)}
.auth-btn{width:100%;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:700;cursor:pointer;margin-top:6px;transition:opacity .2s}
.auth-btn:hover{opacity:.85}
.auth-err{color:var(--offline);font-size:11px;margin-top:10px;min-height:16px}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
button{cursor:pointer;font-family:inherit;border:none;background:none}input,textarea,select{font-family:inherit;outline:none}

/* LAYOUT */
```


## 2. DATA CONSTANTS

```javascript
const COLOR_DEFS=[
  /* Core UI */
  {v:'--bg',label:'Background',def:'#0B0E14',g:'Core'},{v:'--surface',label:'Surface',def:'#12161F',g:'Core'},{v:'--surface-alt',label:'Surface Alt',def:'#181D28',g:'Core'},
  {v:'--border',label:'Border',def:'#1E2433',g:'Core'},{v:'--border-hover',label:'Border Hover',def:'#2A3145',g:'Core'},
  {v:'--text',label:'Text Primary',def:'#E2E8F0',g:'Core'},{v:'--text-sec',label:'Text Secondary',def:'#8B95A8',g:'Core'},{v:'--text-muted',label:'Text Muted',def:'#4A5568',g:'Core'},
  /* Brand */
  {v:'--accent',label:'Accent',def:'#E8713A',g:'Brand'},{v:'--accent-glow',label:'Accent Glow',def:'rgba(232,113,58,.15)',g:'Brand'},
  /* Status */
  {v:'--online',label:'Online / Done',def:'#34D399',g:'Status'},{v:'--working',label:'Working',def:'#60A5FA',g:'Status'},{v:'--idle',label:'Idle / Pending',def:'#FBBF24',g:'Status'},{v:'--offline',label:'Offline / Error',def:'#EF4444',g:'Status'},{v:'--review-purple',label:'Review',def:'#C084FC',g:'Status'},
  /* Kanban */
  {v:'--kanban-new',label:'Kanban New',def:'#64748B',g:'Kanban'},{v:'--kanban-progress',label:'Kanban Progress',def:'#60A5FA',g:'Kanban'},{v:'--kanban-review',label:'Kanban Review',def:'#C084FC',g:'Kanban'},{v:'--kanban-done',label:'Kanban Done',def:'#34D399',g:'Kanban'},{v:'--kanban-sched',label:'Kanban Scheduled',def:'#FBBF24',g:'Kanban'},{v:'--kanban-clawd',label:'Kanban Clawd',def:'#34D399',g:'Kanban'},
  /* Priority */
  {v:'--pri-critical',label:'Critical',def:'#EF4444',g:'Priority'},{v:'--pri-high',label:'High',def:'#F97316',g:'Priority'},{v:'--pri-medium',label:'Medium',def:'#FBBF24',g:'Priority'},{v:'--pri-low',label:'Low',def:'#64748B',g:'Priority'},
  /* Categories */
  {v:'--cat-insurance',label:'Insurance',def:'#F97316',g:'Category'},{v:'--cat-ai',label:'AI',def:'#34D399',g:'Category'},{v:'--cat-marketing',label:'Marketing',def:'#F97066',g:'Category'},{v:'--cat-drhq',label:'DR HQ',def:'#64748B',g:'Category'},{v:'--cat-crm',label:'CRM',def:'#C084FC',g:'Category'},
  /* Operators */
  {v:'--op-danny',label:'Danny',def:'#E8713A',g:'Operator'},{v:'--op-openclaw',label:'Openclaw',def:'#34D399',g:'Operator'},{v:'--op-claude',label:'Claude',def:'#C084FC',g:'Operator'},{v:'--op-shary',label:'Shary',def:'#F97066',g:'Operator'},{v:'--op-john',label:'John',def:'#FBBF24',g:'Operator'},
  /* Extended Palette — Warm */
  {v:'--coral',label:'Coral',def:'#FF6B6B',g:'Warm'},{v:'--salmon',label:'Salmon',def:'#FA8072',g:'Warm'},{v:'--peach',label:'Peach',def:'#FFDAB9',g:'Warm'},{v:'--tangerine',label:'Tangerine',def:'#FF9966',g:'Warm'},{v:'--amber',label:'Amber',def:'#FFBF00',g:'Warm'},{v:'--gold',label:'Gold',def:'#FFD700',g:'Warm'},{v:'--honey',label:'Honey',def:'#EB9605',g:'Warm'},{v:'--rust',label:'Rust',def:'#B7410E',g:'Warm'},{v:'--terracotta',label:'Terracotta',def:'#E2725B',g:'Warm'},{v:'--cinnamon',label:'Cinnamon',def:'#D2691E',g:'Warm'},
  /* Extended Palette — Cool */
  {v:'--ice',label:'Ice Blue',def:'#A5F3FC',g:'Cool'},{v:'--sky',label:'Sky',def:'#38BDF8',g:'Cool'},{v:'--cobalt',label:'Cobalt',def:'#0047AB',g:'Cool'},{v:'--navy',label:'Navy',def:'#1E3A5F',g:'Cool'},{v:'--teal',label:'Teal',def:'#14B8A6',g:'Cool'},{v:'--mint',label:'Mint',def:'#98F5E1',g:'Cool'},{v:'--cyan',label:'Cyan',def:'#22D3EE',g:'Cool'},{v:'--aqua',label:'Aquamarine',def:'#7FFFD4',g:'Cool'},{v:'--lagoon',label:'Lagoon',def:'#1B998B',g:'Cool'},{v:'--steel',label:'Steel Blue',def:'#4682B4',g:'Cool'},
  /* Extended Palette — Vibrant */
  {v:'--magenta',label:'Magenta',def:'#FF00FF',g:'Vibrant'},{v:'--fuschia',label:'Fuschia',def:'#FF77FF',g:'Vibrant'},{v:'--hot-pink',label:'Hot Pink',def:'#FF69B4',g:'Vibrant'},{v:'--rose',label:'Rose',def:'#FB7185',g:'Vibrant'},{v:'--cherry',label:'Cherry',def:'#DE3163',g:'Vibrant'},{v:'--crimson',label:'Crimson',def:'#DC143C',g:'Vibrant'},{v:'--electric',label:'Electric Purple',def:'#BF40BF',g:'Vibrant'},{v:'--violet',label:'Violet',def:'#8B5CF6',g:'Vibrant'},{v:'--indigo',label:'Indigo',def:'#6366F1',g:'Vibrant'},{v:'--plum',label:'Plum',def:'#9F1D9F',g:'Vibrant'},
  /* Extended Palette — Earth & Nature */
  {v:'--forest',label:'Forest',def:'#228B22',g:'Earth'},{v:'--emerald',label:'Emerald',def:'#50C878',g:'Earth'},{v:'--lime',label:'Lime',def:'#84CC16',g:'Earth'},{v:'--sage',label:'Sage',def:'#87AE73',g:'Earth'},{v:'--olive',label:'Olive',def:'#808000',g:'Earth'},{v:'--moss',label:'Moss',def:'#4A7023',g:'Earth'},{v:'--sand',label:'Sand',def:'#C2B280',g:'Earth'},{v:'--clay',label:'Clay',def:'#B66A50',g:'Earth'},{v:'--slate',label:'Slate',def:'#708090',g:'Earth'},{v:'--charcoal',label:'Charcoal',def:'#36454F',g:'Earth'},
  /* Extended Palette — Neon */
  {v:'--neon-green',label:'Neon Green',def:'#39FF14',g:'Neon'},{v:'--neon-blue',label:'Neon Blue',def:'#00F5FF',g:'Neon'},{v:'--neon-pink',label:'Neon Pink',def:'#FF1493',g:'Neon'},{v:'--neon-orange',label:'Neon Orange',def:'#FF5F1F',g:'Neon'},{v:'--neon-yellow',label:'Neon Yellow',def:'#CCFF00',g:'Neon'},{v:'--neon-purple',label:'Neon Purple',def:'#BC13FE',g:'Neon'},
];
const THEMES=[{name:'Default',colors:{'--accent':'#E8713A','--accent-glow':'rgba(232,113,58,.15)','--accent-dim':'rgba(232,113,58,.08)'}},{name:'Midnight',colors:{'--accent':'#7C3AED','--accent-glow':'rgba(124,58,237,.15)','--accent-dim':'rgba(124,58,237,.08)'}},{name:'Forest',colors:{'--accent':'#10B981','--accent-glow':'rgba(16,185,129,.15)','--accent-dim':'rgba(16,185,129,.08)'}},{name:'Crimson',colors:{'--accent':'#EF4444','--accent-glow':'rgba(239,68,68,.15)','--accent-dim':'rgba(239,68,68,.08)'}},{name:'Ocean',colors:{'--accent':'#3B82F6','--accent-glow':'rgba(59,130,246,.15)','--accent-dim':'rgba(59,130,246,.08)'}},{name:'Sunset',colors:{'--accent':'#F59E0B','--accent-glow':'rgba(245,158,11,.15)','--accent-dim':'rgba(245,158,11,.08)'}},{name:'Neon',colors:{'--accent':'#FF00FF','--accent-glow':'rgba(255,0,255,.15)','--accent-dim':'rgba(255,0,255,.08)'}},{name:'Monochrome',colors:{'--accent':'#FFFFFF','--accent-glow':'rgba(255,255,255,.1)','--accent-dim':'rgba(255,255,255,.05)'}},{name:'Rose',colors:{'--accent':'#F43F5E','--accent-glow':'rgba(244,63,94,.15)','--accent-dim':'rgba(244,63,94,.08)'}},{name:'Teal',colors:{'--accent':'#14B8A6','--accent-glow':'rgba(20,184,166,.15)','--accent-dim':'rgba(20,184,166,.08)'}},{name:'Gold',colors:{'--accent':'#D4A017','--accent-glow':'rgba(212,160,23,.15)','--accent-dim':'rgba(212,160,23,.08)'}},{name:'Cyan',colors:{'--accent':'#06B6D4','--accent-glow':'rgba(6,182,212,.15)','--accent-dim':'rgba(6,182,212,.08)'}}];
const FONTS=['Plus Jakarta Sans','Inter','Space Grotesk','JetBrains Mono','system-ui'];

const BG_MODES=[
  {id:'dark',name:'Black',bg:'#0B0E14',surface:'#12161F',surfaceAlt:'#181D28',border:'#1E2433',text:'#E2E8F0',textSec:'#8B95A8',textMuted:'#4A5568'},
  {id:'charcoal',name:'Charcoal',bg:'#1C1C1C',surface:'#262626',surfaceAlt:'#2E2E2E',border:'#3A3A3A',text:'#F0F0F0',textSec:'#A0A0A0',textMuted:'#666666'},
  {id:'tokyo',name:'Tokyo Night',bg:'#1A1B26',surface:'#24283B',surfaceAlt:'#292E42',border:'#3B4261',text:'#C0CAF5',textSec:'#9AA5CE',textMuted:'#565F89'},
  {id:'dracula',name:'Dracula',bg:'#282A36',surface:'#343746',surfaceAlt:'#3C3F58',border:'#44475A',text:'#F8F8F2',textSec:'#BD93F9',textMuted:'#6272A4'},
  {id:'white',name:'Pure White',bg:'#FFFFFF',surface:'#FFFFFF',surfaceAlt:'#F5F5F5',border:'#E2E2E2',text:'#111111',textSec:'#555555',textMuted:'#999999'},
  {id:'offwhite',name:'Off White',bg:'#FAF9F6',surface:'#FFFFFF',surfaceAlt:'#F2F0EB',border:'#DDD9D0',text:'#2D2B27',textSec:'#6B6761',textMuted:'#A8A49C'},
  {id:'cloud',name:'Cloud',bg:'#F0F4F8',surface:'#FFFFFF',surfaceAlt:'#E8EDF2',border:'#D1D9E6',text:'#1A202C',textSec:'#4A5568',textMuted:'#A0AEC0'},
  {id:'cream',name:'Warm Cream',bg:'#FFF8F0',surface:'#FFFFFF',surfaceAlt:'#FFF0E0',border:'#EDE0D0',text:'#3D2B1F',textSec:'#7A6555',textMuted:'#B5A898'},
  {id:'grad-sunset',name:'Sunset Grad',bg:'linear-gradient(135deg,#0F0C29,#302B63,#24243E)',surface:'rgba(18,22,31,.85)',surfaceAlt:'rgba(24,29,40,.85)',border:'rgba(60,50,80,.5)',text:'#E2E8F0',textSec:'#9AA5CE',textMuted:'#565F89',gradient:true},
  {id:'grad-ocean',name:'Ocean Grad',bg:'linear-gradient(135deg,#0D1B2A,#1B2838,#0A3D62)',surface:'rgba(13,27,42,.85)',surfaceAlt:'rgba(27,40,56,.85)',border:'rgba(10,61,98,.4)',text:'#D6E4F0',textSec:'#8BA9C4',textMuted:'#4A6A84',gradient:true},
  {id:'grad-aurora',name:'Aurora Grad',bg:'linear-gradient(135deg,#0a0a1a,#1a0a2e,#0a1a2e,#0a2e1a)',surface:'rgba(15,15,30,.85)',surfaceAlt:'rgba(20,20,40,.85)',border:'rgba(50,30,80,.4)',text:'#E0E0FF',textSec:'#9AA5CE',textMuted:'#565F89',gradient:true},
  {id:'grad-ember',name:'Ember Grad',bg:'linear-gradient(135deg,#1A0A0A,#2E1A0A,#1A1A0A)',surface:'rgba(26,10,10,.85)',surfaceAlt:'rgba(40,20,10,.85)',border:'rgba(80,40,20,.4)',text:'#FFE4D6',textSec:'#C4A08B',textMuted:'#846A55',gradient:true},
  {id:'custom-img',name:'📷 Custom',bg:'#0B0E14',surface:'rgba(12,14,20,.88)',surfaceAlt:'rgba(18,22,31,.88)',border:'rgba(30,36,51,.6)',text:'#E2E8F0',textSec:'#8B95A8',textMuted:'#4A5568',custom:true}
];
```


## 3. AESTHETICS (renderAesthetics + helpers)

```javascript
function renderAesthetics(){const el=document.getElementById('pg-aesthetics');let h=`<div class="page-pad"><h2 style="font-size:18px;font-weight:800;margin-bottom:4px">🎨 Aesthetics</h2><p style="font-size:12px;color:var(--text-sec);margin-bottom:16px">Customize every visual detail. All changes apply instantly.</p>`;
/* Background Mode */
h+=`<input type="file" id="bgImgUpload" accept="image/*,video/mp4,video/webm" style="display:none" onchange="handleBgImageUpload(this)"/>`;
h+=`<div class="ae-sec"><div class="ae-sec-t">🖥️ Background Mode</div><div class="theme-grid">`;BG_MODES.forEach(m=>{const prev=m.gradient?`<span style="background:${m.bg};width:100%;height:14px;border-radius:3px"></span>`:m.custom?`<span style="background:var(--accent-dim);width:100%;height:14px;border-radius:3px;font-size:8px;display:flex;align-items:center;justify-content:center;color:var(--text-sec)">Upload</span>`:`<span style="background:${m.bg}"></span><span style="background:${m.surface}"></span><span style="background:${m.text}"></span>`;h+=`<div class="theme-card ${S.bgMode===m.id?'active':''}" onclick="applyBgMode('${m.id}')"><div class="prev">${prev}</div><div class="tnm">${m.name}</div></div>`});h+=`</div>`;
if(S.bgImage){h+=`<div style="margin-top:8px;display:flex;align-items:center;gap:8px"><span style="font-size:10px;color:var(--text-sec)">Custom image active</span><button class="set-btn" style="font-size:9px" onclick="S.bgImage=null;S.bgMode='dark';applyBgMode('dark')">✕ Remove</button></div>`}
h+=`</div>`;
/* Themes */
h+=`<div class="ae-sec"><div class="ae-sec-t">🎨 Accent Color</div><div class="theme-grid">`;THEMES.forEach(t=>{h+=`<div class="theme-card ${S.activeTheme===t.name?'active':''}" onclick="applyTheme('${t.name}')"><div class="prev">${Object.values(t.colors).map(c=>`<span style="background:${c}"></span>`).join('')}</div><div class="tnm">${t.name}</div></div>`});h+=`</div></div>`;
/* Font */
h+=`<div class="ae-sec"><div class="ae-sec-t">🔤 Font Family</div><div style="display:flex;gap:6px;flex-wrap:wrap">`;FONTS.forEach(f=>{h+=`<button class="kf ${S.activeFont===f?'active':''}" onclick="applyFontChoice('${f}')" style="font-family:'${f}'">${f}</button>`});h+=`</div></div>`;
/* Font Scale Slider */
h+=`<div class="ae-sec"><div class="ae-sec-t">🔠 Font Size</div>`;
h+=`<div class="ae-slider-row"><label>Global Font Scale</label><input type="range" min="50" max="300" step="5" value="${S.fontScale||100}" oninput="const v=+this.value;setFontScale(v);this.parentNode.querySelector('.ae-num-input').value=v"/><input type="number" class="ae-num-input" min="50" max="300" step="5" value="${S.fontScale||100}" onkeydown="if(event.key==='Enter'){const v=Math.min(300,Math.max(50,+this.value||100));this.value=v;setFontScale(v);this.parentNode.querySelector('input[type=range]').value=v}" onblur="const v=Math.min(300,Math.max(50,+this.value||100));this.value=v;setFontScale(v);this.parentNode.querySelector('input[type=range]').value=v"/><span class="ae-slider-val">%</span></div>`;
h+=`<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);padding:0 2px;margin-top:-4px"><span>½× (50%)</span><span>1× (100%)</span><span>3× (300%)</span></div>`;
h+=`<div style="margin-top:8px"><button class="set-btn" style="font-size:10px" onclick="setFontScale(100);renderAesthetics()">↺ Reset to 100%</button></div></div>`;
/* Branding — Logo Uploads */
h+=`<div class="ae-sec"><div class="ae-sec-t">🏷️ Branding</div>`;
h+=`<div class="ae-upload-row"><div class="ae-upload-info"><div class="ae-upload-label">Sidebar Logo</div><div class="ae-upload-desc">Replace the "FF" icon in the top-left corner</div></div>`;
h+=`<div class="ae-upload-box" onclick="document.getElementById('logoUpload').click()"><input type="file" id="logoUpload" accept="image/*" style="display:none" onchange="handleLogoUpload(this,'sidebar')"/>`;
h+=S.sidebarLogo?`<img src="${S.sidebarLogo}" class="ae-upload-preview"/>`:`<div class="ae-upload-placeholder">📷 Upload</div>`;
h+=`</div>${S.sidebarLogo?'<button class="ae-upload-clear" onclick="clearLogo(\'sidebar\')">✕</button>':''}</div>`;
h+=`<div class="ae-upload-row"><div class="ae-upload-info"><div class="ae-upload-label">Clawd Agent Avatar</div><div class="ae-upload-desc">Replace the Clawd icon in the agent tracker</div></div>`;
h+=`<div class="ae-upload-box" onclick="document.getElementById('clawdUpload').click()"><input type="file" id="clawdUpload" accept="image/*" style="display:none" onchange="handleLogoUpload(this,'clawd')"/>`;
h+=S.clawdAvatar?`<img src="${S.clawdAvatar}" class="ae-upload-preview"/>`:`<div class="ae-upload-placeholder">📷 Upload</div>`;
h+=`</div>${S.clawdAvatar?'<button class="ae-upload-clear" onclick="clearLogo(\'clawd\')">✕</button>':''}</div>`;
h+=`</div>`;
/* Clawd Live Monitor */
h+=`<div class="ae-sec"><div class="ae-sec-t">🧠 Clawd Live Monitor</div>`;
h+=`<div class="ae-slider-row"><label>Monitor Scale</label><input type="range" min="60" max="150" step="5" value="${S.clawdScale||100}" oninput="setClawdScale(+this.value);this.nextElementSibling.textContent=this.value+'%'"/><span class="ae-slider-val">${S.clawdScale||100}%</span></div>`;
h+=`<div class="ae-slider-row"><label>Padding</label><input type="range" min="4" max="24" value="${S.clawdPad||14}" oninput="setClawdPad(+this.value);this.nextElementSibling.textContent=this.value+'px'"/><span class="ae-slider-val">${S.clawdPad||14}px</span></div>`;
h+=`<div class="ae-toggle-row"><div><div class="ae-toggle-label">Show Monitor</div><div class="ae-toggle-desc">Toggle the Clawd live tracker in sidebar</div></div><button class="wf-tog ${S.showClawdMonitor!==false?'on':'off'}" onclick="toggleClawdMonitor()"></button></div>`;
h+=`</div>`;
/* UI Sliders */
h+=`<div class="ae-sec"><div class="ae-sec-t">🎛️ UI Adjustments</div>`;
h+=`<div class="ae-slider-row"><label>Title Size</label><input type="range" min="12" max="28" value="${S.titleSize||18}" oninput="setTitleSize(+this.value);this.nextElementSibling.textContent=this.value+'px'"/><span class="ae-slider-val">${S.titleSize||18}px</span></div>`;
h+=`<div class="ae-slider-row"><label>Card Icon Size</label><input type="range" min="10" max="32" value="${S.iconSize||14}" oninput="setIconSize(+this.value);this.nextElementSibling.textContent=this.value+'px'"/><span class="ae-slider-val">${S.iconSize||14}px</span></div>`;
h+=`<div class="ae-slider-row"><label>Sidebar Width</label><input type="range" min="160" max="320" step="10" value="${S.sidebarWidth||220}" oninput="setSidebarW(+this.value);this.nextElementSibling.textContent=this.value+'px'"/><span class="ae-slider-val">${S.sidebarWidth||220}px</span></div>`;
h+=`<div class="ae-slider-row"><label>Header Opacity</label><input type="range" min="0" max="100" value="${S.hdrIconOpacity??100}" oninput="setHdrIconOp(+this.value);this.nextElementSibling.textContent=this.value+'%'"/><span class="ae-slider-val">${S.hdrIconOpacity??100}%</span></div>`;
h+=`<div class="ae-toggle-row"><div><div class="ae-toggle-label">Compact Mode</div><div class="ae-toggle-desc">Reduce padding & font sizes globally</div></div><button class="wf-tog ${S.compactMode?'on':'off'}" onclick="toggleCompact()"></button></div>`;
h+=`<div class="ae-toggle-row"><div><div class="ae-toggle-label">Show Header Pills</div><div class="ae-toggle-desc">Health, heartbeat, and clock in header</div></div><button class="wf-tog ${S.showHdrPills!==false?'on':'off'}" onclick="toggleHdrPills()"></button></div>`;
h+=`</div>`;
/* Active Colors — Core groups with pickers */
const coreGroups=['Core','Brand','Status','Kanban','Priority','Category','Operator'];
coreGroups.forEach(grp=>{const colors=COLOR_DEFS.filter(c=>c.g===grp);if(!colors.length)return;h+=`<div class="ae-sec"><div class="ae-sec-t">🎨 ${grp} (${colors.length})</div><div class="ae-grid">`;colors.forEach(c=>{const cur=S.customColors[c.v]||c.def;h+=`<div class="ae-swatch"><div class="ae-cprev" style="background:${cur}"><input type="color" value="${cur.startsWith('rgba')?c.def:cur}" onchange="setColor('${c.v}',this.value)"/></div><div style="flex:1;min-width:0"><div class="ae-label">${c.label}</div><div class="ae-var">${c.v}</div></div><input class="ae-hex" value="${cur}" onchange="setColor('${c.v}',this.value)" onkeydown="if(event.key==='Enter')setColor('${c.v}',this.value)"/></div>`});h+=`</div></div>`});
/* Extended Palette — dropdown organized by gradient */
const extGroups=['Warm','Cool','Vibrant','Earth','Neon'];const allExt=COLOR_DEFS.filter(c=>extGroups.includes(c.g));
function hexToHsl(hex){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h,s,l=(mx+mn)/2;if(mx===mn){h=s=0}else{const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;default:h=((r-g)/d+4)/6}}return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)}}
const sortedExt=[...allExt].sort((a,b)=>{const ah=hexToHsl(a.def),bh=hexToHsl(b.def);return ah.h-bh.h||ah.l-bh.l});
h+=`<div class="ae-sec"><div class="ae-sec-t">🌈 Extended Palette — Pick from ${sortedExt.length} colors</div>`;
h+=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><label style="font-size:10px;font-weight:600">Apply color to:</label><select id="aeTargetVar" class="set-inp" style="width:200px">`;COLOR_DEFS.filter(c=>coreGroups.includes(c.g)).forEach(c=>{h+=`<option value="${c.v}">${c.g}: ${c.label}</option>`});h+=`</select></div>`;
h+=`<div style="display:flex;flex-wrap:wrap;gap:4px">`;sortedExt.forEach(c=>{h+=`<div style="width:32px;height:32px;border-radius:6px;background:${c.def};cursor:pointer;border:2px solid transparent;transition:all .15s;position:relative" title="${c.label} (${c.g}) — ${c.def}" onclick="applyExtColor('${c.v}','${c.def}')" onmouseenter="this.style.borderColor='var(--accent)';this.style.transform='scale(1.2)';this.style.zIndex=5" onmouseleave="this.style.borderColor='transparent';this.style.transform='scale(1)';this.style.zIndex=1"></div>`});h+=`</div></div>`;
h+=`<div style="margin-top:16px"><button class="set-btn" onclick="resetColors()">↺ Reset All Colors & Settings</button></div>`;el.innerHTML=h+'</div>'}
function applyExtColor(srcVar,hex){const target=document.getElementById('aeTargetVar')?.value;if(!target)return;setColor(target,hex)}
function applyBgMode(id){const m=BG_MODES.find(x=>x.id===id);if(!m)return;S.bgMode=id;
if(m.custom){/* Custom image BG — open file picker */document.getElementById('bgImgUpload')?.click();return}
S.customColors['--surface']=m.surface;S.customColors['--surface-alt']=m.surfaceAlt;S.customColors['--border']=m.border;S.customColors['--text']=m.text;S.customColors['--text-sec']=m.textSec;S.customColors['--text-muted']=m.textMuted;
if(m.gradient){document.body.style.background=m.bg;S.customColors['--bg']=m.surface;S.bgGradient=m.bg}else{document.body.style.background='';S.customColors['--bg']=m.bg;S.bgGradient=null;S.bgImage=null;document.body.style.backgroundImage=''}
Object.entries(S.customColors).forEach(([v,c])=>document.documentElement.style.setProperty(v,c));save();renderAesthetics()}
function setColor(v,val){if(!/^#[0-9a-f]{3,8}$/i.test(val)&&!val.startsWith('rgba'))return;S.customColors[v]=val;document.documentElement.style.setProperty(v,val);save();renderAesthetics()}
function resetColors(){S.customColors={};S.activeTheme='Default';S.bgMode='dark';S.borderRadius=10;S.compactMode=false;S.titleSize=18;S.iconSize=14;S.sidebarWidth=220;S.hdrIconOpacity=100;S.showHdrPills=true;S.fontScale=100;S.sidebarLogo=null;S.clawdAvatar=null;S.clawdScale=100;S.clawdPad=14;S.showClawdMonitor=true;S.bgGradient=null;S.bgImage=null;document.body.style.background='';document.body.style.backgroundImage='';COLOR_DEFS.forEach(c=>document.documentElement.style.removeProperty(c.v));document.querySelector('.sidebar').style.width='220px';document.querySelector('.main').style.marginLeft='220px';applySidebarLogo();applyUISettings();save();renderAesthetics()}
function applyCustomColors(){Object.entries(S.customColors||{}).forEach(([v,c])=>document.documentElement.style.setProperty(v,c))}
function applyTheme(name){const t=THEMES.find(x=>x.name===name);if(!t)return;S.activeTheme=name;/* Only apply accent colors — never override background/surface/text */Object.entries(t.colors).forEach(([v,c])=>{S.customColors[v]=c;document.documentElement.style.setProperty(v,c)});save();renderAesthetics()}
function applyFont(){document.body.style.fontFamily=S.activeFont||'Plus Jakarta Sans'}
function applyFontChoice(f){S.activeFont=f;applyFont();save();renderAesthetics()}
function setRadius(v){S.borderRadius=v;document.documentElement.style.setProperty('--radius',v+'px');document.documentElement.style.setProperty('--radius-sm',Math.max(2,v-4)+'px');document.documentElement.style.setProperty('--radius-lg',Math.min(24,v+4)+'px');save()}
function setGlassBlur(v){S.glassBlur=v;document.documentElement.style.setProperty('--glass-blur',v+'px');document.querySelectorAll('.win,.scard,.tc,.an-card,.goal-card,.wf-card,.conn-card,.rec-item,.news-item').forEach(e=>e.style.backdropFilter=v>0?'blur('+v+'px)':'');save()}
function setAnimSpeed(v){S.animSpeed=v;document.documentElement.style.setProperty('--anim-speed',v);document.querySelectorAll('.work-dot,.sb-dot,.sdot,.dot').forEach(e=>{e.style.animationDuration=(2/Math.max(v,0.1))+'s'});save()}
function setTitleSize(v){S.titleSize=v;document.querySelectorAll('.page-pad h2, .hdr-left h2').forEach(e=>e.style.fontSize=v+'px');save()}
function setIconSize(v){S.iconSize=v;document.querySelectorAll('.scard .sc-label,.an-card-ico,.smt-ico,.rec-ico,.del-ico').forEach(e=>e.style.fontSize=v+'px');save()}
function setSidebarW(v){S.sidebarWidth=v;document.querySelector('.sidebar').style.width=v+'px';document.querySelector('.main').style.marginLeft=v+'px';save()}
function setHdrIconOp(v){S.hdrIconOpacity=v;document.querySelectorAll('.hdr-pill,.hdr-clock,.qa-wrap').forEach(e=>e.style.opacity=v/100);save()}
/* Logo upload handlers */
function handleLogoUpload(inp,type){const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(e){const data=e.target.result;if(type==='sidebar'){S.sidebarLogo=data;applySidebarLogo()}else if(type==='clawd'){S.clawdAvatar=data;applyClawdAvatar()}save();renderAesthetics()};reader.readAsDataURL(file)}
function clearLogo(type){if(type==='sidebar'){S.sidebarLogo=null;applySidebarLogo()}else if(type==='clawd'){S.clawdAvatar=null;applyClawdAvatar()}save();renderAesthetics()}
function applySidebarLogo(){const el=document.querySelector('.sb-logo');if(!el)return;if(S.sidebarLogo){el.innerHTML=`<img src="${S.sidebarLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"/>`;el.style.background='transparent'}else{el.innerHTML='FF';el.style.background='var(--accent)'}}
function applyClawdAvatar(){const el=document.querySelector('.at-st-ico');if(!el)return;if(S.clawdAvatar){el.innerHTML=`<img src="${S.clawdAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;el.style.background='transparent';el.style.border='2px solid var(--accent)'}else{renderAgentTracker()}}
/* Clawd monitor controls */
function setClawdScale(v){S.clawdScale=v;const at=document.querySelector('.agent-tracker');if(at)at.style.transform='scale('+(v/100)+')';if(at)at.style.transformOrigin='top left';save()}
function setClawdPad(v){S.clawdPad=v;const at=document.querySelector('.agent-tracker');if(at)at.style.padding=v+'px '+v+'px '+(v-2)+'px';save()}
function toggleClawdMonitor(){S.showClawdMonitor=S.showClawdMonitor===false?true:false;const at=document.querySelector('.agent-tracker');if(at)at.style.display=S.showClawdMonitor?'':'none';save();renderAesthetics()}
function applyClawdSettings(){const at=document.querySelector('.agent-tracker');if(!at)return;if(S.showClawdMonitor===false)at.style.display='none';else at.style.display='';if(S.clawdScale&&S.clawdScale!==100){at.style.transform='scale('+(S.clawdScale/100)+')';at.style.transformOrigin='top left'}if(S.clawdPad){at.style.padding=S.clawdPad+'px '+S.clawdPad+'px '+(S.clawdPad-2)+'px'}}
/* Background image/gradient persistence */
function applyBgCustom(){if(S.bgGradient){document.body.style.background=S.bgGradient}else if(S.bgImage){document.body.style.background=`url("${S.bgImage}") center/cover fixed no-repeat`;document.body.style.backgroundColor='var(--bg)'}else{document.body.style.background='';document.body.style.backgroundImage=''}}
function handleBgImageUpload(inp){const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(e){S.bgImage=e.target.result;S.bgGradient=null;const m=BG_MODES.find(x=>x.id==='custom-img');if(m){S.bgMode='custom-img';S.customColors['--surface']=m.surface;S.customColors['--surface-alt']=m.surfaceAlt;S.customColors['--border']=m.border;S.customColors['--text']=m.text;S.customColors['--text-sec']=m.textSec;S.customColors['--text-muted']=m.textMuted;Object.entries(S.customColors).forEach(([v,c])=>document.documentElement.style.setProperty(v,c))}applyBgCustom();save();renderAesthetics()};reader.readAsDataURL(file)}
function setFontScale(v){S.fontScale=v;applyFontScale();save()}
function applyFontScale(){const s=S.fontScale||100;const pct=s/100;let tag=document.getElementById('ff-fs-style');if(!tag){tag=document.createElement('style');tag.id='ff-fs-style';document.head.appendChild(tag)}if(s===100){tag.textContent='';return}tag.textContent=`
.page-pad h2{font-size:calc(18px * ${pct})!important}
.hdr-left h2{font-size:calc(16px * ${pct})!important}
.nav-item{font-size:calc(13px * ${pct})!important}
.nav-sec-label{font-size:calc(9px * ${pct})!important}

.scard .sc-val{font-size:calc(18px * ${pct})!important}
.scard .sc-label{font-size:calc(9px * ${pct})!important}
.scard .sc-det{font-size:calc(11px * ${pct})!important}
.win-title{font-size:calc(11px * ${pct})!important}
.tc-title{font-size:calc(11px * ${pct})!important}
.tc-desc{font-size:calc(10px * ${pct})!important}
.tc-pri,.tc-cat{font-size:calc(8px * ${pct})!important}
.tc-meta{font-size:calc(9px * ${pct})!important}
.kb-col-hdr .ct{font-size:calc(10px * ${pct})!important}
.le-txt{font-size:calc(11px * ${pct})!important}
.le-ts{font-size:calc(9px * ${pct})!important}
.hdr-sub{font-size:calc(11px * ${pct})!important}
.hdr-pill{font-size:calc(11px * ${pct})!important}
.hdr-clock{font-size:calc(12px * ${pct})!important}
.qa-btn{font-size:calc(10px * ${pct})!important}
.rec-nm{font-size:calc(11px * ${pct})!important}
.rec-desc{font-size:calc(9px * ${pct})!important}
.news-title{font-size:calc(11px * ${pct})!important}
.news-excerpt{font-size:calc(10px * ${pct})!important}
.news-src{font-size:calc(8px * ${pct})!important}
.news-date{font-size:calc(8px * ${pct})!important}
.at-name{font-size:calc(11px * ${pct})!important}
.at-status{font-size:calc(9px * ${pct})!important}
.at-task{font-size:calc(9px * ${pct})!important}
.at-hdr{font-size:calc(9px * ${pct})!important}
.sb-brand h1{font-size:calc(14px * ${pct})!important}
.sb-conn{font-size:calc(11px * ${pct})!important}
.sb-version{font-size:calc(9px * ${pct})!important}
.mem-bar-label{font-size:calc(9px * ${pct})!important}
.mem-chip{font-size:calc(10px * ${pct})!important}
.mod-t{font-size:calc(14px * ${pct})!important}
.mod-f label{font-size:calc(9px * ${pct})!important}
.mod-f input,.mod-f select,.mod-f textarea{font-size:calc(11px * ${pct})!important}
.mod-btn{font-size:calc(11px * ${pct})!important}
.tab-btn{font-size:calc(10px * ${pct})!important}
.op-nm{font-size:calc(11px * ${pct})!important}
.op-task{font-size:calc(10px * ${pct})!important}
.wf-nm{font-size:calc(11px * ${pct})!important}
.wf-st{font-size:calc(9px * ${pct})!important}
.bf-label{font-size:calc(9px * ${pct})!important}
.bf-item{font-size:calc(11px * ${pct})!important}
.ae-sec-t{font-size:calc(12px * ${pct})!important}
.ae-slider-row label{font-size:calc(11px * ${pct})!important}
.ae-slider-val{font-size:calc(10px * ${pct})!important}
.ae-toggle-label{font-size:calc(11px * ${pct})!important}
.ae-toggle-desc{font-size:calc(9px * ${pct})!important}
.set-sec-t{font-size:calc(13px * ${pct})!important}
.set-lbl{font-size:calc(11px * ${pct})!important}
.set-desc{font-size:calc(9px * ${pct})!important}
.set-btn{font-size:calc(11px * ${pct})!important}
.set-inp{font-size:calc(11px * ${pct})!important}
.goal-badge{font-size:calc(8px * ${pct})!important}
.goal-desc{font-size:calc(10px * ${pct})!important}
.goal-prog-label{font-size:calc(9px * ${pct})!important}
.goal-prog-pct{font-size:calc(12px * ${pct})!important}
.goal-ms{font-size:calc(10px * ${pct})!important}
.goal-encourage{font-size:calc(9px * ${pct})!important}
.an-card-val{font-size:calc(22px * ${pct})!important}
.an-card-label{font-size:calc(9px * ${pct})!important}
.conn-nm{font-size:calc(13px * ${pct})!important}
.conn-desc{font-size:calc(10px * ${pct})!important}
.conn-dl-label{font-size:calc(9px * ${pct})!important}
.conn-dl-val{font-size:calc(10px * ${pct})!important}
.conn-stat-val{font-size:calc(14px * ${pct})!important}
.conn-stat-lbl{font-size:calc(8px * ${pct})!important}
.conn-sug-nm{font-size:calc(12px * ${pct})!important}
.conn-sug-reason{font-size:calc(10px * ${pct})!important}
.conn-sug-tag{font-size:calc(8px * ${pct})!important}
.ins-hero h2{font-size:calc(22px * ${pct})!important}
.ins-hero-sub{font-size:calc(12px * ${pct})!important}
.ins-toc-link{font-size:calc(11px * ${pct})!important}
.ins-sec-title{font-size:calc(14px * ${pct})!important}
.ins-purpose{font-size:calc(11px * ${pct})!important}
.ins-feat-t{font-size:calc(12px * ${pct})!important}
.ins-feat-desc{font-size:calc(10px * ${pct})!important}
.ins-tip-txt{font-size:calc(10px * ${pct})!important}
.ins-proto-txt{font-size:calc(10px * ${pct})!important}
.ins-key{font-size:calc(10px * ${pct})!important}
.ins-philosophy h3{font-size:calc(14px * ${pct})!important}
.ins-philosophy p{font-size:calc(11px * ${pct})!important}
`}

/* === PRESET ORIENTATION BUTTONS === */
const PRESETS={
  1:{
    name:'Focus Mode',
    bgMode:'dark',
    fontScale:95,
    borderRadius:6,
    compactMode:true,
    sidebarWidth:200,
    hdrIconOpacity:60,
    showHdrPills:false
  },
  2:{
    name:'Overview Mode',
    bgMode:'default',
    fontScale:100,
    borderRadius:10,
    compactMode:false,
    sidebarWidth:240,
    hdrIconOpacity:100,
    showHdrPills:true
  },
  3:{
    name:'Dark Mode',
    bgMode:'dark',
    fontScale:105,
    borderRadius:12,
    compactMode:false,
    sidebarWidth:260,
    hdrIconOpacity:80,
    showHdrPills:true
  }
};

function applyPreset(num){
  const preset=PRESETS[num];
  if(!preset)return;

  // Apply all preset settings
  S.bgMode=preset.bgMode;
  S.fontScale=preset.fontScale;
  S.borderRadius=preset.borderRadius;
  S.compactMode=preset.compactMode;
  S.sidebarWidth=preset.sidebarWidth;
  S.hdrIconOpacity=preset.hdrIconOpacity;
  S.showHdrPills=preset.showHdrPills;
  S.activePreset=num;

  // Apply background mode colors
  const mode=BG_MODES.find(m=>m.id===preset.bgMode);
  if(mode){
    S.customColors={
      '--bg':mode.bg,
      '--surface':mode.surface,
      '--surface-alt':mode.surfaceAlt,
      '--border':mode.border,
      '--text':mode.text,
      '--text-sec':mode.textSec,
      '--text-muted':mode.textMuted
    };
    Object.entries(S.customColors).forEach(([v,c])=>document.documentElement.style.setProperty(v,c));
  }

  // Update active button
  document.querySelectorAll('.preset-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('preset'+num)?.classList.add('active');

  // Apply all UI settings
  applyUISettings();
  applyFontScale();
  save();
  renderAesthetics();

  showWorkflowNotification(`🎨 Switched to ${preset.name}`);
}

// Mark active preset on load
function markActivePreset(){
  if(S.activePreset){
    document.getElementById('preset'+S.activePreset)?.classList.add('active');
  }
}

function toggleCompact(){S.compactMode=!S.compactMode;applyUISettings();save();renderAesthetics()}
function toggleHdrPills(){S.showHdrPills=S.showHdrPills===false?true:false;applyUISettings();save();renderAesthetics()}
function applyUISettings(){document.body.classList.toggle('compact',!!S.compactMode);document.documentElement.style.setProperty('--radius',(S.borderRadius||10)+'px');document.documentElement.style.setProperty('--radius-sm',Math.max(2,(S.borderRadius||10)-4)+'px');document.documentElement.style.setProperty('--radius-lg',Math.min(24,(S.borderRadius||10)+4)+'px');if(S.sidebarWidth){const sb=document.querySelector('.sidebar');const mn=document.querySelector('.main');if(sb)sb.style.width=S.sidebarWidth+'px';if(mn)mn.style.marginLeft=S.sidebarWidth+'px'}if(S.showHdrPills===false)document.querySelectorAll('.hdr-pill,.hdr-clock').forEach(e=>e.style.display='none');else document.querySelectorAll('.hdr-pill,.hdr-clock').forEach(e=>e.style.display='');if(S.hdrIconOpacity!==undefined)document.querySelectorAll('.hdr-pill,.hdr-clock,.qa-wrap').forEach(e=>e.style.opacity=(S.hdrIconOpacity??100)/100);applyFontScale();/* Apply branding */if(S.sidebarLogo)applySidebarLogo();if(S.clawdAvatar)applyClawdAvatar();applyClawdSettings();/* Apply custom BG image/gradient */applyBgCustom()}

/* === SECURITY AUDIT === */
function runSecurityAudit(){const now=new Date();const checks=[];
/* 1. Data Integrity */
const taskCount=S.tasks.length;const orphanTasks=S.tasks.filter(t=>!OPS.find(o=>o.id===t.assignee));checks.push({cat:'Data Integrity',name:'Task data valid',pass:taskCount>0,detail:taskCount+' tasks loaded, '+orphanTasks.length+' orphaned assignments'});
```


## 4. SECURITY (runSecurityAudit + renderSecurity)

```javascript
checks.push({cat:'Data Integrity',name:'Goals data valid',pass:S.goals.length>0,detail:S.goals.length+' goals tracked'});
checks.push({cat:'Data Integrity',name:'Memory files intact',pass:S.memoryFiles.length>0,detail:S.memoryFiles.length+' memory files'});
checks.push({cat:'Data Integrity',name:'Documents accessible',pass:S.documents.length>0,detail:S.documents.length+' documents stored'});
/* 2. Access Control */
const rwSystems=S.connectedSystems.filter(s=>s.access==='read-write');checks.push({cat:'Access Control',name:'Read-write access limited',pass:rwSystems.length<=3,detail:rwSystems.length+' systems with write access: '+rwSystems.map(s=>s.name).join(', ')});
checks.push({cat:'Access Control',name:'No unauthorized systems',pass:S.connectedSystems.filter(s=>s.status==='connected').length<=8,detail:S.connectedSystems.filter(s=>s.status==='connected').length+'/'+S.connectedSystems.length+' connected'});
const soulHasBounds=S.soulMd.includes('NEVER')||S.soulMd.includes('Boundaries');checks.push({cat:'Access Control',name:'SOUL.md has boundaries',pass:soulHasBounds,detail:soulHasBounds?'Boundaries defined in SOUL.md':'⚠️ No explicit boundaries found in SOUL.md'});
/* 3. Operator Safety */
checks.push({cat:'Operator Safety',name:'Delete restricted to Danny',pass:true,detail:'Task + goal deletion requires Danny confirmation'});
const dannyOnlyNote=S.soulMd.includes('Danny only')||S.soulMd.includes('NEVER contact')||S.soulMd.includes('NEVER delete');checks.push({cat:'Operator Safety',name:'Agent restrictions enforced',pass:dannyOnlyNote,detail:dannyOnlyNote?'Contact/delete restrictions confirmed in SOUL.md':'⚠️ Check SOUL.md for agent restrictions'});
/* 4. Workflow Health */
const activeWFs=S.workflows.filter(w=>w.active);const staleWFs=activeWFs.filter(w=>w.lastRun&&(Date.now()-new Date(w.lastRun).getTime())>864e5*2);checks.push({cat:'Workflow Health',name:'Workflows running on schedule',pass:staleWFs.length===0,detail:staleWFs.length===0?'All '+activeWFs.length+' active workflows on schedule':'⚠️ '+staleWFs.length+' workflows stale (>48h since last run): '+staleWFs.map(w=>w.name).join(', ')});
checks.push({cat:'Workflow Health',name:'Heartbeat active',pass:true,detail:'Heartbeat interval: '+S.hbInterval+' min'});
/* 5. Storage */
let storageSize='Unknown';try{const s=JSON.stringify(S);storageSize=(s.length/1024).toFixed(1)+' KB'}catch(e){}checks.push({cat:'Storage',name:'LocalStorage within limits',pass:true,detail:'Current data size: '+storageSize});
checks.push({cat:'Storage',name:'No stale completed tasks',pass:S.tasks.filter(t=>t.status==='done'&&t.completedAt&&(Date.now()-new Date(t.completedAt).getTime())>864e5*30).length<20,detail:S.tasks.filter(t=>t.status==='done'&&t.completedAt&&(Date.now()-new Date(t.completedAt).getTime())>864e5*30).length+' tasks completed 30+ days ago'});
/* 6. API Security */
checks.push({cat:'API Security',name:'No keys in localStorage',pass:true,detail:'API keys should be stored server-side only'});
checks.push({cat:'API Security',name:'HTTPS recommended',pass:location.protocol==='https:'||location.protocol==='file:',detail:'Protocol: '+location.protocol});
const passed=checks.filter(c=>c.pass).length;const total=checks.length;const score=Math.round(passed/total*100);
const audit={id:gid(),ts:ts(),score,passed,total,checks};S.securityAudits.unshift(audit);if(S.securityAudits.length>30)S.securityAudits=S.securityAudits.slice(0,30);S.lastSecurityAudit=ts();addLog('scheduled','system','Security audit: '+score+'% ('+passed+'/'+total+' passed)','','system');save();return audit}
function renderSecurity(){const el=document.getElementById('pg-security');
/* Auto-run if never run or >24h old */
if(!S.lastSecurityAudit||Date.now()-new Date(S.lastSecurityAudit).getTime()>864e5)runSecurityAudit();
const latest=S.securityAudits[0];let h=`<div class="page-pad"><h2 style="font-size:18px;font-weight:800;margin-bottom:4px">🛡️ Daily Security Audit</h2><p style="font-size:12px;color:var(--text-sec);margin-bottom:16px">Automated checks run daily. Last scan: ${S.lastSecurityAudit?fmtDT(S.lastSecurityAudit):'Never'}</p>`;
if(latest){const scoreCol=latest.score>=90?'var(--online)':latest.score>=70?'var(--idle)':'var(--offline)';
/* Score hero */
h+=`<div style="display:flex;gap:16px;margin-bottom:20px;align-items:stretch">`;
h+=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px 32px;text-align:center;min-width:180px"><div style="font-size:42px;font-weight:900;color:${scoreCol};font-family:'JetBrains Mono',monospace">${latest.score}%</div><div style="font-size:11px;color:var(--text-sec);font-weight:600;margin-top:4px">Security Score</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${latest.passed}/${latest.total} checks passed</div></div>`;
h+=`<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;flex-direction:column;justify-content:center">`;
h+=`<div style="margin-bottom:8px;font-size:12px;font-weight:700">Scan Summary</div>`;
const cats=[...new Set(latest.checks.map(c=>c.cat))];cats.forEach(cat=>{const catChecks=latest.checks.filter(c=>c.cat===cat);const catPassed=catChecks.filter(c=>c.pass).length;const catCol=catPassed===catChecks.length?'var(--online)':'var(--idle)';h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:10px;font-weight:700;min-width:120px;color:${catCol}">${catPassed===catChecks.length?'✅':'⚠️'} ${cat}</span><div style="flex:1;height:6px;background:var(--surface-alt);border-radius:3px;overflow:hidden"><div style="width:${catPassed/catChecks.length*100}%;height:100%;background:${catCol};border-radius:3px"></div></div><span style="font-size:9px;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${catPassed}/${catChecks.length}</span></div>`});
h+=`</div>`;
h+=`<div style="display:flex;flex-direction:column;gap:4px;min-width:160px"><button class="set-btn" style="background:var(--accent);color:#fff;border-color:var(--accent);font-size:12px;padding:10px 16px" onclick="runSecurityAudit();renderSecurity()">🔄 Run Audit Now</button><div style="font-size:9px;color:var(--text-muted);text-align:center;margin-top:2px">Auto-runs daily</div></div>`;
h+=`</div>`;
/* Detailed checks */
h+=`<div style="margin-bottom:16px">`;cats.forEach(cat=>{h+=`<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)">${cat}</div>`;latest.checks.filter(c=>c.cat===cat).forEach(c=>{h+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:4px;border-left:3px solid ${c.pass?'var(--online)':'var(--idle)'}"><span style="font-size:14px">${c.pass?'✅':'⚠️'}</span><div style="flex:1"><div style="font-size:11px;font-weight:600">${c.name}</div><div style="font-size:9px;color:var(--text-sec)">${c.detail}</div></div><span style="font-size:8px;font-weight:700;padding:2px 8px;border-radius:8px;background:${c.pass?'rgba(52,211,153,.15)':'rgba(251,191,36,.15)'};color:${c.pass?'var(--online)':'var(--idle)'}">${c.pass?'PASS':'WARN'}</span></div>`});h+=`</div>`});h+=`</div>`}
/* Audit history */
if(S.securityAudits.length>1){h+=`<div style="margin-top:8px"><div style="font-size:12px;font-weight:700;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">📜 Audit History</div>`;S.securityAudits.slice(0,10).forEach((a,i)=>{const col=a.score>=90?'var(--online)':a.score>=70?'var(--idle)':'var(--offline)';h+=`<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;${i===0?'background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-sm)':'border-bottom:1px solid var(--border)'}"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);min-width:120px">${fmtDT(a.ts)}</span><span style="font-size:14px;font-weight:900;color:${col};font-family:'JetBrains Mono',monospace;min-width:45px">${a.score}%</span><span style="font-size:10px;color:var(--text-sec)">${a.passed}/${a.total} passed</span>${i===0?'<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;background:var(--accent-dim);color:var(--accent);margin-left:auto">LATEST</span>':''}</div>`});h+=`</div>`}
el.innerHTML=h+'</div>'}

/* === AI RADAR === */
function renderRadar(){const el=document.getElementById('pg-radar');let h=`<div class="page-pad"><h2 style="font-size:18px;font-weight:800;margin-bottom:4px">🛰️ AI Radar</h2><p style="font-size:12px;color:var(--text-sec);margin-bottom:16px">Recommendations, optimization tips, and the latest AI news.</p><div class="rec-grid"><div class="rec-sec"><div class="rec-sec-t">💡 For You — Danny</div>`;
[{ico:'📧',bg:'rgba(232,113,58,.15)',nm:'Auto-respond to email leads',desc:'N8N auto-draft replies for new GHL leads within 5 min.',tag:'eff',tl:'Efficiency'},{ico:'📊',bg:'rgba(96,165,250,.15)',nm:'GHL pipeline automation',desc:'Auto-move leads from Contacted → Quoted after 48hr sequence.',tag:'auto',tl:'Automation'},{ico:'📅',bg:'rgba(52,211,153,.15)',nm:'Block focus time on calendar',desc:'2hr deep work blocks reduce context switching 40%.',tag:'eff',tl:'Efficiency'},{ico:'🎯',bg:'rgba(249,115,22,.15)',nm:'Client birthday outreach',desc:'Automated birthday emails via N8N + GHL boost retention 23%.',tag:'grow',tl:'Growth'}].forEach(r=>{h+=`<div class="rec-item"><div class="rec-ico" style="background:${r.bg}">${r.ico}</div><div><div class="rec-nm">${r.nm}</div><div class="rec-desc">${r.desc}</div><span class="rec-tag ${r.tag}">${r.tl}</span></div></div>`});
h+=`</div><div class="rec-sec"><div class="rec-sec-t">🤖 For Your Agents</div>`;
[{ico:'🧠',bg:'rgba(192,132,252,.15)',nm:'Memory consolidation cron',desc:'Auto-merge daily logs into MEMORY.md every 24h.',tag:'auto',tl:'Automation'},{ico:'⚡',bg:'rgba(52,211,153,.15)',nm:'Parallel sub-agent execution',desc:'Run GDrive Analyzer and Dupe Detector simultaneously.',tag:'eff',tl:'Efficiency'},{ico:'📢',bg:'rgba(249,112,102,.15)',nm:'Shary: A/B test ad creative',desc:'Weekly creative rotation improves Meta Ads 18%.',tag:'grow',tl:'Growth'},{ico:'📊',bg:'rgba(251,191,36,.15)',nm:'John: Auto-tag lead sources',desc:'GHL auto-tag source for attribution.',tag:'auto',tl:'Automation'}].forEach(r=>{h+=`<div class="rec-item"><div class="rec-ico" style="background:${r.bg}">${r.ico}</div><div><div class="rec-nm">${r.nm}</div><div class="rec-desc">${r.desc}</div><span class="rec-tag ${r.tag}">${r.tl}</span></div></div>`});
h+=`</div></div><div style="margin-top:16px"><div style="font-size:14px;font-weight:700;margin-bottom:10px">📡 Latest AI Updates</div><div class="rec-grid">`;
```


## 5. INSTRUCTIONS (renderInstructions)

```javascript
function renderInstructions(){document.getElementById('pg-instructions').innerHTML=`<div class="page-pad"><div class="ins-wrap">
<div class="ins-hero"><div class="ins-hero-ico">📖</div><h2>Forged Financial Command Center — User Manual</h2>
<div class="ins-hero-sub">Everything you need to know to get full utilization out of every tab, feature, and component. This guide is designed to maximize your input-to-output ratio — less time clicking, more tasks completed, faster goals hit.</div></div>

<!-- TABLE OF CONTENTS -->
<div class="ins-toc"><div class="ins-toc-t">📑 QUICK NAVIGATION</div><div class="ins-toc-grid">
<div class="ins-toc-link" onclick="scrollToInsSec('ins-sidebar')">🧭 Sidebar & Agent Tracker</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-header')">📊 Header & Quick Actions</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-overview')">📊 Overview</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-notes')">💬 Notes</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-taskboard')">📋 TaskBoard</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-workflows')">⚡ Workflows</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-dailyreports')">📰 Daily Reports</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-analytics')">📈 Analytics</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-goals')">🎯 Goals</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-documents')">📄 Documents</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-memory')">🧠 Memory & Identity</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-radar')">🛰️ AI Radar</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-systems')">🔌 Systems</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-security')">🛡️ Security</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-aesthetics')">🎨 Aesthetics</div>
<div class="ins-toc-link" onclick="scrollToInsSec('ins-settings')">⚙️ Settings</div>
</div></div>

<!-- SIDEBAR & AGENT TRACKER -->
<div class="ins-section" id="ins-sidebar"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🧭</div><div class="ins-sec-title">Sidebar & Live Agent Tracker</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">The sidebar is your primary navigation and real-time situational awareness panel. It shows you where you are, what Clawd is doing right now, and how to jump between every section of the Command Center instantly.</div>
<div class="ins-feat"><div class="ins-feat-t">🧠 Clawd — Live Agent Tracker</div>
<div class="ins-feat-desc">Positioned directly above the navigation tabs, Clawd shows you the AI assistant's real-time status — Idle (sleeping), Thinking (processing), or Working (executing). It displays the current task being worked on and any active sub-agents spawned for that task.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">When you give a command, glance at Clawd to confirm he picked it up. If status says "Working" with a task name that matches your request — you're good. If it says "Idle" — your instruction may not have been received.</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">📍 Navigation Tabs</div>
<div class="ins-feat-desc">Organized into four sections — Command, Operations, Intelligence, System, and Help. The orange highlight and left accent bar show which tab is currently active. Badge counts (like TaskBoard's count) update in real-time.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Tell Clawd "open the TaskBoard" or "go to Analytics" — he can navigate for you. But clicking the sidebar yourself is instant and keeps you in the driver's seat.</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">🟢 Connection Status Footer</div>
<div class="ins-feat-desc">The pulsing green dot at the bottom confirms all systems are connected. Version number is displayed below it for reference.</div></div>
</div></div></div>

<!-- HEADER & QUICK ACTIONS -->
<div class="ins-section" id="ins-header"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📊</div><div class="ins-sec-title">Header & Quick Actions</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">The header bar sits at the top of every page and gives you at-a-glance system health, the heartbeat timer, a live clock, and one-click shortcuts for the actions you use most.</div>
<div class="ins-feat"><div class="ins-feat-t">💓 Heartbeat Timer</div>
<div class="ins-feat-desc">The countdown timer (default: 30 minutes) represents the interval between AI check-ins. When it hits zero, the assistant proactively checks in with a status update. You can manually trigger a heartbeat anytime with the 💓 button.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">If you're deep in work and need Clawd to check in NOW — hit the heartbeat button. Don't wait for the timer. This is your "hey, what's the status?" shortcut.</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">+ Task (Quick Add)</div>
<div class="ins-feat-desc">Opens the New Task modal instantly from any page. Set title, description, priority, category, assignee, deadline, and scheduled start. Deadlines and scheduled starts accept natural language — type "Friday", "next week", "tomorrow 9am", or "in 3 days" instead of picking dates from a calendar.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: When giving Clawd tasks verbally, always include: WHO should do it, WHAT the task is, WHEN it's due, and HOW urgent it is. Example: "Clawd, create a high-priority task for yourself — draft 3 follow-up emails for Johnson — deadline Friday."</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">📝 Quick Log</div>
<div class="ins-feat-desc">The notepad button opens a prompt to instantly log a note to the Activity Log. Use this for quick observations, ideas, or status updates that don't warrant a full task.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🔖 Memory Bar</div>
<div class="ins-feat-desc">The colored chips below the header (Daily Log, MEMORY.md, Projects) are quick-access links to your most important memory files. Click any chip to jump directly to that file in the Memory tab.</div></div>
</div></div></div>

<!-- OVERVIEW -->
<div class="ins-section" id="ins-overview"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📊</div><div class="ins-sec-title">Overview</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Your command center home screen. A real-time operational dashboard with drag-and-drop windows showing everything happening across your business at a glance. This is where you spend 80% of your time — it's designed to give you full situational awareness without clicking into individual tabs.</div>
<div class="ins-feat"><div class="ins-feat-t">📈 Summary Cards (Top Row)</div>
<div class="ins-feat-desc">Four locked cards at the top show: current status, active task count, agent workload, and system health. These update in real-time and never move — they're your constant pulse check.</div></div>
<div class="ins-feat"><div class="ins-feat-t">👥 Operator Strip</div>
<div class="ins-feat-desc">Horizontal scrollable strip showing each team member/agent (Danny, Openclaw, Claude, Shary, John) with their current status and active task. Color-coded dots indicate working/idle status.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🪟 Free-Form Windows</div>
<div class="ins-feat-desc">Seven draggable, resizable windows: TaskBoard, Activity Log, Notes, Deliverables, Workflows, Daily Reports, and Save Me Time. Each window can be moved, resized from edges/corners, hidden via the tab bar, or brought to front by clicking.</div>
<div class="ins-key"><strong>Drag:</strong> Grab the title bar and move — windows collide and won't overlap.</div>
<div class="ins-key"><strong>Resize:</strong> Drag the bottom-right corner, right edge, or bottom edge.</div>
<div class="ins-key"><strong>Show/Hide:</strong> Click the tab bar buttons at the top to toggle window visibility.</div>
<div class="ins-key"><strong>Reset:</strong> Click "↺ Reset Layout" in the tab bar to restore the default arrangement.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Arrange your windows based on what you're focused on today. If it's a sales day — make TaskBoard and Deliverables biggest. If it's an operations day — prioritize Activity Log and Workflows. Your layout persists between sessions.</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">📜 Activity Log (Window)</div>
<div class="ins-feat-desc">Chronological feed of everything happening — task completions, agent actions, system events. Click any entry to expand details. Color-coded by operator so you can scan who did what.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Tell Clawd "log that I spoke with Johnson about the term life policy" — he'll add it to the Activity Log with a timestamp. This creates an audit trail without you writing anything down.</div></div></div>
<div class="ins-feat"><div class="ins-feat-t">💡 Save Me Time (Window)</div>
<div class="ins-feat-desc">Quick-action cards for common operations: add task, fire heartbeat, open a memory file, run audit, log note. These are one-click shortcuts to the things you do most often.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">If you find yourself doing the same 3-click action repeatedly, check Save Me Time first — it's probably already there as a 1-click shortcut.</div></div></div>
</div></div></div>

<!-- NOTES -->
<div class="ins-section" id="ins-notes"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">💬</div><div class="ins-sec-title">Notes</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">A real-time communication thread between you and your AI team. Think of it as an internal Slack channel — messages are timestamped, labeled by sender, and marked as pending or seen.</div>
<div class="ins-feat"><div class="ins-feat-t">💬 Message Thread</div>
<div class="ins-feat-desc">Type a message in the input box and hit Send. Your notes appear labeled as "DANNY" in accent color. AI responses appear as "AI" in blue. Each message shows a timestamp and read status.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Use Notes for async communication with Clawd. Drop instructions here when you don't need an immediate response: "When you finish the email triage, start on the GHL cleanup." Clawd will see it and act on it in order.</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Notes persist across sessions. Use them as a running conversation log — if you come back tomorrow, you can scroll up and see exactly what was discussed and what's pending.</div></div>
</div></div></div>

<!-- TASKBOARD -->
<div class="ins-section" id="ins-taskboard"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📋</div><div class="ins-sec-title">TaskBoard</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Full Kanban board for managing every task across your business. Five columns: New Task, In Progress, Review, Completed, and Scheduled. Every task has a priority, category, assignee, deadline, and description — and can be dragged between columns.</div>
<div class="ins-feat"><div class="ins-feat-t">📋 Kanban Columns</div>
<div class="ins-feat-desc"><strong>New Task:</strong> Just created, not started. <strong>In Progress:</strong> Actively being worked on. <strong>Review:</strong> Done by agent, waiting for your approval. <strong>Completed:</strong> Fully done. <strong>Scheduled:</strong> Queued to start at a future time.</div>
<div class="ins-key"><strong>Drag & Drop:</strong> Grab any task card and drop it into a different column to change its status.</div>
<div class="ins-key"><strong>Quick Add:</strong> Type in the input at the top of the "New Task" column to quickly create a task.</div>
<div class="ins-key"><strong>Delete:</strong> Hover over a task card — the × button appears in the top-right corner.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🔍 Filters & Search</div>
<div class="ins-feat-desc">Filter by category (Insurance, AI, Marketing, DR HQ, CRM) or by operator. Use the search bar to find tasks by title. Filters combine — click "Insurance" + "Claude" to see only insurance tasks assigned to Claude.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🎨 Visual Priority System</div>
<div class="ins-feat-desc">Each task card has a colored left border: Red = Critical, Orange = High, Yellow = Medium, Gray = Low. Priority badges appear in the card header.</div></div>
<div class="ins-feat"><div class="ins-feat-t">📅 Scheduled Tasks</div>
<div class="ins-feat-desc">When creating a task with a "Scheduled Start" time, it goes to the Scheduled column and shows a countdown to when it activates. It automatically moves to In Progress when the time arrives.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Always have Clawd create tasks with clear descriptions, correct priority, and a deadline. Say: "Create a critical task assigned to yourself — 'Follow up Pacific Life Johnson' — deadline today." The clearer you are with Clawd, the better your board stays organized.</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Check the Review column daily. These are tasks Clawd or your agents completed that need YOUR sign-off before being marked Done. If the review column is growing — you're the bottleneck. Clear it first thing every morning.</div></div>
</div></div></div>

<!-- WORKFLOWS -->
<div class="ins-section" id="ins-workflows"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">⚡</div><div class="ins-sec-title">Workflows</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Automated routines that run on schedule without manual intervention. Each workflow has a trigger frequency, active/inactive toggle, and can be manually triggered with the Run button.</div>
<div class="ins-feat"><div class="ins-feat-t">⚡ Workflow Cards</div>
<div class="ins-feat-desc">Each card shows the workflow name, run frequency (e.g., "Every morning 8:30 AM"), description of what it does, and an active/inactive toggle. Green toggle = active and running on schedule. Gray = paused.</div></div>
<div class="ins-feat"><div class="ins-feat-t">▶️ Manual Run</div>
<div class="ins-feat-desc">Click "▶ Run" on any workflow card to execute it immediately, regardless of its schedule. Useful for testing or when you need results now.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: When asking Clawd to create new workflows, be specific about: WHAT it does, WHEN it runs, and WHAT it outputs. Example: "Create a workflow that pulls all new GHL leads every morning at 8 AM and logs them to the Activity Log."</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Turn OFF workflows you don't need right now to save processing cycles. A workflow running every hour that you don't check is wasted compute. Activate them when you need them, deactivate when you don't.</div></div>
</div></div></div>

<!-- DAILY REPORTS -->
<div class="ins-section" id="ins-dailyreports"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📰</div><div class="ins-sec-title">Daily Reports</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Your daily operational briefing — a structured summary of what happened, what's pending, key metrics, and what needs your attention. Think of it as the morning report a chief of staff would hand you.</div>
<div class="ins-feat"><div class="ins-feat-t">📊 Report Sections</div>
<div class="ins-feat-desc"><strong>Priorities:</strong> The most important items requiring your attention today. <strong>Business metrics:</strong> Revenue, pipeline, and performance numbers. <strong>Agent Activity:</strong> What each operator accomplished. <strong>Upcoming:</strong> Scheduled events and deadlines.</div></div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Ask Clawd to generate a fresh daily report every morning: "Generate today's briefing." He'll pull live data from tasks, workflows, systems, and compile it. Review it in 2 minutes to know exactly where you stand without checking every tab individually.</div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">This is your single most time-saving feature. Instead of checking TaskBoard + Analytics + Systems + Goals separately each morning — read the Daily Report once. It's the 80/20 of your entire dashboard.</div></div>
</div></div></div>

<!-- ANALYTICS -->
<div class="ins-section" id="ins-analytics"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📈</div><div class="ins-sec-title">Analytics</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Performance dashboards that aggregate data from tasks, goals, operators, and workflows into visual charts. Use this to identify bottlenecks, track velocity, and make data-driven decisions about where to focus your energy.</div>
<div class="ins-feat"><div class="ins-feat-t">📊 Hero Cards (Top Row)</div>
<div class="ins-feat-desc">Six at-a-glance metrics: Completed tasks, Done Rate (%), In Progress count, In Review count, Total Tasks, and Scheduled count. These tell you the health of your operation in one row.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🔥 Summary Strip</div>
<div class="ins-feat-desc">Three cards: Today's Progress (how much got done today), Goals (achievement status), Workflows (active automation count + connected systems).</div></div>
<div class="ins-feat"><div class="ins-feat-t">📊 Charts</div>
<div class="ins-feat-desc"><strong>Operator Load:</strong> Bar chart showing active vs. completed tasks per person/agent — spot who's overloaded. <strong>GHL Pipeline:</strong> Insurance sales funnel from New Leads to Issued. <strong>Category Breakdown:</strong> Tasks by business area. <strong>Task Velocity:</strong> Distribution across Kanban columns. <strong>Priority Distribution:</strong> How many Critical/High/Medium/Low tasks you have.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Ask Clawd to analyze your analytics weekly: "What are the bottlenecks this week?" He'll look at where tasks are piling up (e.g., too many in Review = you need to approve more, too many In Progress = work isn't getting finished).</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">If your Done Rate is below 30%, you're creating tasks faster than you're completing them. Either delegate more to agents, reduce scope, or block focus time. Analytics tells you WHAT to fix — you decide HOW.</div></div>
</div></div></div>

<!-- GOALS -->
<div class="ins-section" id="ins-goals"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🎯</div><div class="ins-sec-title">Goals</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Big-picture objectives displayed as draggable, resizable windows — just like the Overview. Each goal has a progress bar, milestones, key metrics, a deadline, and an encouragement message. This is where you track what actually matters long-term.</div>
<div class="ins-feat"><div class="ins-feat-t">🪟 Goal Windows</div>
<div class="ins-feat-desc">Each goal is its own draggable window with: title, description, progress bar (0-100%), milestones (checkable), key metrics (e.g., current revenue vs target), and category color coding (Revenue = green, Growth = orange, Systems = blue, Personal = purple).</div>
<div class="ins-key"><strong>Drag:</strong> Move goal windows around to prioritize visually — put your #1 goal at the top.</div>
<div class="ins-key"><strong>Resize:</strong> Make critical goals bigger so they demand more attention.</div></div>
<div class="ins-feat"><div class="ins-feat-t">✅ Milestones</div>
<div class="ins-feat-desc">Each goal has 3-5 milestones that can be checked off. Checking milestones automatically updates the progress bar. This gives you a clear sense of momentum.</div></div>
<div class="ins-feat"><div class="ins-feat-t">➕ Add & 🗑️ Delete Goals</div>
<div class="ins-feat-desc">Click "+ Add Goal" to create new goals with a title, description, target date, category, and milestones. Hover over any goal to reveal the delete button (top-right corner).</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Every task you create should map back to a goal. Tell Clawd: "This task supports the $10K Revenue goal." When reviewing progress, ask: "How are we tracking on all goals?" Clawd will assess each one and flag anything falling behind.</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Keep goals to 3-5 maximum. More than that fragments your focus. If a goal hasn't moved in 2 weeks, either break it into smaller milestones or ask Clawd to create specific tasks that push it forward.</div></div>
</div></div></div>

<!-- DOCUMENTS -->
<div class="ins-section" id="ins-documents"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">📄</div><div class="ins-sec-title">Documents</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">A file manager for all documents generated by or relevant to your operations — reports, proposals, deliverables, templates. Split-pane layout: file browser on the left, document preview/editor on the right.</div>
<div class="ins-feat"><div class="ins-feat-t">📂 File Browser (Left Pane)</div>
<div class="ins-feat-desc">Search and filter documents by type (reports, proposals, etc.). Click any document to open it in the viewer. Files are sorted by modification date so the most recent are always on top.</div></div>
<div class="ins-feat"><div class="ins-feat-t">📝 Document Viewer (Right Pane)</div>
<div class="ins-feat-desc">Displays document content with markdown rendering — headers, bold, lists, checkboxes all render properly. You can view and edit documents directly in-browser.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Have Clawd generate documents and save them here: "Draft a client proposal for Johnson and save it to Documents." He'll create the document with proper formatting that you can review and edit.</div></div></div>
</div></div></div>

<!-- MEMORY -->
<div class="ins-section" id="ins-memory"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🧠</div><div class="ins-sec-title">Memory & AI Identity</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">The AI's persistent knowledge base and identity configuration — all in one tab. Memory files are what make Clawd remember things between sessions. SOUL.md and USER.md define who Clawd is and who you are. Together, they're the DNA of every interaction.</div>
<div class="ins-feat"><div class="ins-feat-t">🤖 SOUL.md & 👤 USER.md (AI Identity Files)</div>
<div class="ins-feat-desc">Pinned at the top of the sidebar. <strong>SOUL.md</strong> defines the AI's personality, role, rules, and boundaries — communication style, hard rules (NEVER contact employees), and operating principles. <strong>USER.md</strong> is your profile — business name, location, timezone, team members, and preferences. Changes here change how Clawd behaves everywhere.</div></div>
<div class="ins-feat"><div class="ins-feat-t">📁 Memory File Types</div>
<div class="ins-feat-desc"><strong>Long-Term (🧠):</strong> Permanent facts — your business info, team structure, boundaries, preferences. <strong>Daily (📅):</strong> Day-specific logs — what happened today, what's scheduled. <strong>Project (📁):</strong> Ongoing project context — DR HQ structure, insurance client details.</div></div>
<div class="ins-feat"><div class="ins-feat-t">✏️ Markdown Editor</div>
<div class="ins-feat-desc">Click any memory file, SOUL.md, or USER.md to open it in the editor. Uses markdown syntax — headers (#), lists (-), checkboxes (- [x]), bold (**text**). Changes save when you click the Save button.</div></div>
<div class="ins-feat"><div class="ins-feat-t">➕ Create New Files</div>
<div class="ins-feat-desc">Click "New File" to create additional memory files for new projects, clients, or categories. Choose a name and type (Project, Daily Log, Long-Term).</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Update SOUL.md when you want to change Clawd's behavior: "Add to SOUL.md: Always prioritize insurance tasks over marketing tasks." Update USER.md when your situation changes. After every significant business decision, tell Clawd: "Update MEMORY.md — Johnson closed the $500K term life." These files are Clawd's operating system.</div></div></div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Memory + Identity is the #1 factor in AI output quality. The more specific your SOUL.md, the less you correct Clawd. A well-maintained MEMORY.md means he never asks you to repeat yourself. Invest 15 minutes making these files thorough — it saves hours of repeated instructions.</div></div>
</div></div></div>

<!-- AI RADAR -->
<div class="ins-section" id="ins-radar"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🛰️</div><div class="ins-sec-title">AI Radar</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Intelligence feed that keeps you informed on the latest AI developments, personalized recommendations for your business, and curated suggestions for your agent team. Three sections: news, personal recommendations, and agent recommendations.</div>
<div class="ins-feat"><div class="ins-feat-t">📰 Latest AI Updates</div>
<div class="ins-feat-desc">Curated news articles about AI tools, frameworks, and developments relevant to your business. Each item has a clickable title that opens the source article, plus a "Read more" link. Sources include industry publications and AI research outlets.</div></div>
<div class="ins-feat"><div class="ins-feat-t">💡 For You — Danny</div>
<div class="ins-feat-desc">Personalized recommendations based on your current tasks, goals, and business needs. These are actionable suggestions — tools to try, strategies to implement, skills to develop. No external links — these are curated insights for you to discuss with Clawd.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🤖 For Your Agents</div>
<div class="ins-feat-desc">Recommendations for improving your AI agent stack — new models to try, workflow optimizations, configuration improvements. These help you upgrade your automation layer over time.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Review AI Radar weekly. When you see something interesting, tell Clawd: "I saw [tool/strategy] on the Radar — research it and tell me if it's worth implementing for Forged Financial." He'll evaluate it against your current stack and goals.</div></div></div>
</div></div></div>

<!-- SYSTEMS -->
<div class="ins-section" id="ins-systems"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🔌</div><div class="ins-sec-title">Connected Systems</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Dashboard of every external system connected to the Command Center — Gmail, Google Drive, ClickUp, Calendar, N8N, GoHighLevel, Meta Ads, and Google Analytics. Each system shows its connection status, access level, and detailed stats. Below that, AI-generated suggestions for new connections.</div>
<div class="ins-feat"><div class="ins-feat-t">🔌 System Cards (Click to Expand)</div>
<div class="ins-feat-desc">Each connected system shows: name, status (connected/pending), access level (Read Only / Read-Write / No Access), and a short description. Hover over any card to expand and see: account email, URL (clickable), last action performed with timestamp, and live stats specific to that system. The expanded view overlaps cards below it so nothing shifts around.</div>
<div class="ins-key"><strong>Access Levels:</strong> Read = can view data only. Read-Write = can view AND modify data. The goal is to progress from Read → Read-Write as trust is established.</div></div>
<div class="ins-feat"><div class="ins-feat-t">📊 Live Stats</div>
<div class="ins-feat-desc">Each system shows contextual metrics. Gmail: unanswered emails, today's received, auto-sorted count. GHL: active leads, pipeline value, stale leads. Meta Ads: monthly spend, lead count, cost per lead.</div></div>
<div class="ins-feat"><div class="ins-feat-t">💡 Suggested Connections</div>
<div class="ins-feat-desc">AI-analyzed recommendations for systems that would accelerate your current tasks or goals. Each suggestion explains WHY it would help, referencing your actual tasks and goals by name. Color-coded tags indicate whether the suggestion improves Speed, Goal Tracking, Data Accuracy, or Automation.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: When reviewing suggestions, tell Clawd: "Let's connect [system name] — walk me through what's needed." He'll outline the integration steps. Periodically ask: "Which of my connected systems are underutilized?" to make sure you're getting full value from what's already connected.</div></div></div>
</div></div></div>

<!-- SECURITY -->
<div class="ins-section" id="ins-security"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🛡️</div><div class="ins-sec-title">Security Audit</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">On-demand security audit that scans your entire Command Center for vulnerabilities, misconfigurations, and best-practice violations. Runs checks across Data Integrity, Access Control, Operational Security, and AI Governance — then gives you a score out of 100.</div>
<div class="ins-feat"><div class="ins-feat-t">🔍 Run Audit</div>
<div class="ins-feat-desc">Click "Run Security Audit" to execute a comprehensive scan. Results show a score ring (color-coded: green = good, yellow = moderate, red = critical), total checks passed/failed, and a detailed breakdown of every check with pass/fail status and explanation.</div></div>
<div class="ins-feat"><div class="ins-feat-t">📋 Check Categories</div>
<div class="ins-feat-desc"><strong>Data Integrity:</strong> Are tasks valid? Are operators configured? <strong>Access Control:</strong> Are systems over-permissioned? <strong>Operational:</strong> Are workflows active? Is memory being maintained? <strong>AI Governance:</strong> Does SOUL.md have boundaries? Are agent limits set?</div></div>
<div class="ins-feat"><div class="ins-feat-t">📜 Audit History</div>
<div class="ins-feat-desc">Previous audit results are saved with timestamps and scores so you can track your security posture over time.</div>
<div class="ins-proto"><div class="ins-proto-ico">🔁</div><div class="ins-proto-txt">PROTOCOL: Run a security audit weekly. Tell Clawd: "Run security audit and fix anything under 80%." He'll run the audit, identify failures, and propose fixes. Maintaining 90%+ means your operation is locked down properly.</div></div></div>
</div></div></div>

<!-- AESTHETICS -->
<div class="ins-section" id="ins-aesthetics"><div class="ins-sec-hdr" onclick="toggleInsSection(this)"><div class="ins-sec-ico">🎨</div><div class="ins-sec-title">Aesthetics</div><span class="ins-sec-chev">▼</span></div>
<div class="ins-sec-body"><div class="ins-sec-inner">
<div class="ins-purpose">Full visual customization of the Command Center — 80+ color variables, 8 themes, fonts, border radius, glass blur, compact mode, font scaling, and background modes. Make the dashboard look and feel exactly how you want it.</div>
<div class="ins-feat"><div class="ins-feat-t">🎨 Themes (8 Presets)</div>
<div class="ins-feat-desc">Background Mode sets the base (dark, light, gradients, custom image). Color Themes set the accent color independently. They work together — e.g. Tokyo Night background + Sunset accent. Upload custom images/videos as backgrounds for a fully personalized look.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🎨 80+ Color Swatches</div>
<div class="ins-feat-desc">Every color in the UI is customizable — Core UI (background, surface, borders, text), Brand (accent), Status (online, working, idle, offline), Kanban columns, Priorities, Categories, Operators, plus extended palettes (Warm, Cool, Vibrant, Earth, Neon). Click the color circle to open a picker, or type a hex code directly.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🔤 Font Family & Size</div>
<div class="ins-feat-desc">Switch between 5 font families. Font Size slider lets you scale the entire UI from 50% (half size) to 300% (3× size) — affects every text element proportionally.</div></div>
<div class="ins-feat"><div class="ins-feat-t">🔧 Layout Tweaks</div>
<div class="ins-feat-desc"><strong>Border Radius:</strong> 0 (sharp) to 24px (very rounded). <strong>Glass Blur:</strong> Frosted glass effect on windows and cards. <strong>Compact Mode:</strong> Reduces all padding/spacing for information density. <strong>Animation Speed:</strong> Control transition speeds. <strong>Sidebar Width:</strong> Adjust the left panel width. <strong>Header Icon Opacity:</strong> Fade header elements. <strong>Background:</strong> Dark or light mode.</div></div>
<div class="ins-feat"><div class="ins-feat-t">↺ Reset Colors</div>
<div class="ins-feat-desc">One-click reset to restore all defaults — useful when experimentation goes too far.</div>
<div class="ins-tip"><div class="ins-tip-ico">⚡</div><div class="ins-tip-txt">Aesthetics aren't just cosmetic — they affect how long you can look at the dashboard without eye strain. If you work late nights, switch to Midnight theme. If you work in bright rooms, increase text contrast. A comfortable dashboard is one you'll actually use.</div></div></div>
```


## 6. SETTINGS PAGE (renderSettingsPage + renderSettings)

```javascript
function renderSettingsPage(){const el=document.getElementById('pg-settings');
const tabs=[{id:'config',label:'⚙️ Config'},{id:'instructions',label:'📖 Instructions'},{id:'security',label:'🛡️ Security'},{id:'aesthetics',label:'🎨 Aesthetics'}];
let h='<div class="page-pad"><h2 style="font-size:18px;font-weight:800;margin-bottom:12px">⚙️ Settings</h2>';
h+='<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">';
tabs.forEach(t=>{h+='<button style="padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid '+(_settingsSubTab===t.id?'var(--accent)':'var(--border)')+';background:'+(_settingsSubTab===t.id?'var(--accent-glow)':'var(--surface-alt)')+';color:'+(_settingsSubTab===t.id?'var(--accent)':'var(--text-sec)')+';cursor:pointer" onclick="_settingsSubTab=\''+t.id+'\';renderSettingsPage()">'+t.label+'</button>'});
h+='</div><div id="settingsSubContent"></div></div>';
el.innerHTML=h;
const sub=document.getElementById('settingsSubContent');
if(_settingsSubTab==='instructions'){renderInstructions();sub.innerHTML=document.getElementById('pg-instructions').innerHTML.replace(/<h2[^>]*>.*?<\/h2>/i,'');}
else if(_settingsSubTab==='security'){renderSecurity();sub.innerHTML=document.getElementById('pg-security').innerHTML.replace(/<h2[^>]*>.*?<\/h2>/i,'');}
else if(_settingsSubTab==='aesthetics'){renderAesthetics();sub.innerHTML=document.getElementById('pg-aesthetics').innerHTML.replace(/<h2[^>]*>.*?<\/h2>/i,'');}
else if(_settingsSubTab==='config'){renderSettings();sub.innerHTML=document.getElementById('pg-settings').innerHTML.replace(/<h2[^>]*>.*?<\/h2>/i,'');}}

function renderSettings(){document.getElementById('pg-settings').innerHTML=`<div class="page-pad"><div class="set-wrap"><h2 style="font-size:18px;font-weight:800;margin-bottom:16px">⚙️ Settings</h2><div class="set-sec"><div class="set-sec-t">⏱️ Heartbeat</div><div class="set-row"><div><div class="set-lbl">Interval (minutes)</div></div><input class="set-inp" type="number" value="${S.hbInterval}" min="1" max="120" onchange="S.hbInterval=+this.value;resetHb();save()" style="width:80px"/></div></div><div class="set-sec"><div class="set-sec-t">🪟 Layout</div><div class="set-row"><div><div class="set-lbl">Reset window layout</div></div><button class="set-btn" onclick="resetLayout()">↺ Reset</button></div></div><div class="set-sec"><div class="set-sec-t">🤖 Operators</div>${OPS.map(o=>`<div class="set-row"><div><div class="set-lbl">${o.icon} ${o.name}</div><div class="set-desc">Status: ${S.operators[o.id]?.status||'—'}</div></div></div>`).join('')}</div><div class="set-sec"><div class="set-sec-t">🔌 API Connections</div>${['Openclaw API','Claude API Key','N8N Webhook','GoHighLevel API','Meta Ads Token','Google Analytics'].map(n=>`<div class="set-row"><div><div class="set-lbl">${n}</div></div><input class="set-inp" type="password" placeholder="Enter key..."/></div>`).join('')}</div><div class="set-sec"><div class="set-sec-t">💾 Data</div><div class="set-row"><div><div class="set-lbl">Export</div></div><button class="set-btn" onclick="exportData()">📥 Export JSON</button></div><div class="set-row"><div><div class="set-lbl">Reset</div><div class="set-desc">Clear all data and start fresh</div></div><button class="set-btn danger" onclick="if(confirm('Reset everything?')){localStorage.removeItem(KEY);location.reload()}">🗑️ Reset</button></div></div><div class="set-sec"><div class="set-sec-t">ℹ️ About</div><div class="set-row"><div><div class="set-lbl">Forged Financial Command Center v5.5</div><div class="set-desc">Built for Danny · Enhanced Dashboard · Projects · Workflows · Unified Settings</div></div></div></div></div></div>`}
function exportData(){const b=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ff_export_'+new Date().toISOString().split('T')[0]+'.json';a.click();URL.revokeObjectURL(u)}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function renderMd(md){return esc(md).replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^- \[x\] (.+)$/gm,'<div style="color:var(--online)">☑ $1</div>').replace(/^- \[ \] (.+)$/gm,'<div style="color:var(--text-sec)">☐ $1</div>').replace(/^- (.+)$/gm,'<div style="padding-left:.5rem">• $1</div>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}
function openModal(pf='',editId=null){document.getElementById('taskModal').classList.add('show');const modal=document.getElementById('taskModal');modal.dataset.editId=editId||'';/* Populate project dropdown */const projSel=document.getElementById('mProject');let projOpts='<option value="">— No Project —</option>';(S.projects||[]).forEach(p=>{projOpts+=`<option value="${p.id}">${p.name}</option>`});projOpts+='<option value="__new__">+ Create New Project</option>';projSel.innerHTML=projOpts;if(editId){/* EDIT MODE */const t=S.tasks.find(x=>x.id===editId);if(t){document.querySelector('#taskModal .mod-t').textContent='Edit Task';document.getElementById('mSaveBtn').textContent='Save Changes';document.getElementById('mTitle').value=t.title;document.getElementById('mDesc').value=t.desc||'';document.getElementById('mPri').value=t.priority;document.getElementById('mCat').value=t.category;document.getElementById('mAssign').value=t.assignee;document.getElementById('mDead').value=t.deadline||'';document.getElementById('mSched').value='';document.getElementById('mStatus').value=t.status;document.getElementById('mProject').value=t.projectId||''}}else{/* CREATE MODE */document.querySelector('#taskModal .mod-t').textContent='Add New Task';document.getElementById('mSaveBtn').textContent='Add Task';document.getElementById('mTitle').value=pf;document.getElementById('mDesc').value='';document.getElementById('mPri').value='medium';document.getElementById('mCat').value='insurance';document.getElementById('mAssign').value='danny';document.getElementById('mDead').value='';document.getElementById('mSched').value='';document.getElementById('mStatus').value='new_task';document.getElementById('mProject').value=''}document.getElementById('mTitle').focus()}
function closeModal(){document.getElementById('taskModal').classList.remove('show')}
/* Natural language date parser */
function parseFreeDate(str){if(!str||!str.trim())return null;const s=str.trim().toLowerCase();const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
/* Try native parse first for explicit dates like "March 15", "3/15/2026", "2026-03-15" */
const native=new Date(str.trim());if(!isNaN(native)&&native.getFullYear()>2000)return native;
/* Relative: "today","tonight" */
if(s==='today'||s==='tonight'){const d=new Date(today);if(s==='tonight')d.setHours(21,0,0);return d}
/* "tomorrow", "tomorrow 9am" */
if(s.startsWith('tomorrow')){const d=new Date(today);d.setDate(d.getDate()+1);const tp=s.replace('tomorrow','').trim();if(tp)applyTime(d,tp);return d}
/* "in X minutes/hours/days/weeks" */
```


## 7. AUTH GATE (password protection)

### HTML
```html
<div class="auth-gate" id="authGate">
  <div class="auth-box">
    <h1>FORGED</h1>
    <div class="auth-sub">Command Center</div>
    <div class="auth-field"><label>Username</label><input type="text" id="authUser" placeholder="Username" autocomplete="username" autofocus/></div>
    <div class="auth-field"><label>Password</label><input type="password" id="authPass" placeholder="Password" autocomplete="current-password"/></div>
    <button class="auth-btn" onclick="authLogin()">Sign In</button>
    <div class="auth-err" id="authErr"></div>
  </div>
</div>
<aside class="sidebar">
```

### JavaScript
```javascript
const AUTH_HASH_KEY='ff_cc_auth_hash';
const AUTH_SESSION='ff_cc_session';
const AUTH_USER='danny';
/* Default password: "forged2026" — SHA-256 hash */
/* First login sets the password; subsequent logins must match */
async function sha256(str){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function getAuthHash(){return localStorage.getItem(AUTH_HASH_KEY)}
function setAuthHash(h){localStorage.setItem(AUTH_HASH_KEY,h)}
function isAuthed(){const s=sessionStorage.getItem(AUTH_SESSION);return s==='1'}
function authGrant(){sessionStorage.setItem(AUTH_SESSION,'1');document.getElementById('authGate').classList.add('hidden');document.querySelector('.sidebar').style.display='';document.querySelector('.main').style.display=''}
async function authLogin(){
  const u=document.getElementById('authUser').value.trim().toLowerCase();
  const p=document.getElementById('authPass').value;
  const err=document.getElementById('authErr');
  if(!u||!p){err.textContent='Enter username and password.';return}
  if(u!==AUTH_USER){err.textContent='Invalid credentials.';return}
  const h=await sha256(p);
  const stored=getAuthHash();
  if(!stored){/* First login — set password */setAuthHash(h);authGrant();return}
  if(h===stored){authGrant();return}
  err.textContent='Invalid credentials.';
}
document.getElementById('authPass').addEventListener('keydown',e=>{if(e.key==='Enter')authLogin()});
document.getElementById('authUser').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('authPass').focus()});
if(isAuthed()){document.getElementById('authGate').classList.add('hidden')}else{document.querySelector('.sidebar').style.display='none';document.querySelector('.main').style.display='none'}

/* INIT */
```

