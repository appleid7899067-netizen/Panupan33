import{B as e,It as t,Rt as n,q as r,r as i,rt as a,z as o}from"./catalog-C1Ub4IrL.js";var s=r(`send`,[[`path`,{d:`M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z`,key:`1ffxy3`}],[`path`,{d:`m21.854 2.147-10.94 10.939`,key:`12cjpa`}]]),c=n(t(),1),l=e=>{let t,n=new Set,r=(e,r)=>{let i=typeof e==`function`?e(t):e;if(!Object.is(i,t)){let e=t;t=r??(typeof i!=`object`||!i)?i:Object.assign({},t,i),n.forEach(n=>n(t,e))}},i=()=>t,a={setState:r,getState:i,getInitialState:()=>o,subscribe:e=>(n.add(e),()=>n.delete(e))},o=t=e(r,i,a);return a},u=(e=>e?l(e):l),d=e=>e;function f(e,t=d){let n=c.useSyncExternalStore(e.subscribe,c.useCallback(()=>t(e.getState()),[e,t]),c.useCallback(()=>t(e.getInitialState()),[e,t]));return c.useDebugValue(n),n}var p=e=>{let t=u(e),n=e=>f(t,e);return Object.assign(n,t),n},m=(e=>e?p(e):p);function h(e,t){let n;try{n=e()}catch{return}return{getItem:e=>{let r=e=>e===null?null:JSON.parse(e,t?.reviver),i=n.getItem(e)??null;return i instanceof Promise?i.then(r):r(i)},setItem:(e,r)=>n.setItem(e,JSON.stringify(r,t?.replacer)),removeItem:e=>n.removeItem(e)}}var g=e=>t=>{try{let n=e(t);return n instanceof Promise?n:{then(e){return g(e)(n)},catch(e){return this}}}catch(e){return{then(e){return this},catch(t){return g(t)(e)}}}},_=(e,t)=>(n,r,i)=>{let a={storage:h(()=>window.localStorage),partialize:e=>e,version:0,merge:(e,t)=>({...t,...e}),...t},o=!1,s=0,c=new Set,l=new Set,u=a.storage;if(!u)return e((...e)=>{console.warn(`[zustand persist middleware] Unable to update item '${a.name}', the given storage is currently unavailable.`),n(...e)},r,i);let d=()=>{let e=a.partialize({...r()});return u.setItem(a.name,{state:e,version:a.version})},f=i.setState;i.setState=(e,t)=>(f(e,t),d());let p=e((...e)=>(n(...e),d()),r,i);i.getInitialState=()=>p;let m,_=()=>{if(!u)return;let e=++s;o=!1,c.forEach(e=>e(r()??p));let t=a.onRehydrateStorage?.call(a,r()??p)||void 0;return g(u.getItem.bind(u))(a.name).then(e=>{if(e){if(typeof e.version==`number`&&e.version!==a.version){if(a.migrate){let t=a.migrate(e.state,e.version);return t instanceof Promise?t.then(e=>[!0,e]):[!0,t]}console.error(`State loaded from storage couldn't be migrated since no migrate function was provided`)}else return[!1,e.state]}return[!1,void 0]}).then(t=>{if(e!==s)return;let[i,o]=t;if(m=a.merge(o,r()??p),n(m,!0),i)return d()}).then(()=>{e===s&&(t?.(r(),void 0),m=r(),o=!0,l.forEach(e=>e(m)))}).catch(n=>{e===s&&t?.(void 0,n)})};return i.persist={setOptions:e=>{a={...a,...e},e.storage&&(u=e.storage)},clearStorage:()=>{++s,u?.removeItem(a.name)},getOptions:()=>a,rehydrate:()=>_(),hasHydrated:()=>o,onHydrate:e=>(c.add(e),()=>{c.delete(e)}),onFinishHydration:e=>(l.add(e),()=>{l.delete(e)})},a.skipHydration||_(),m||p},v=()=>({id:`welcome`,title:`Welcome`,createdAt:Date.now(),updatedAt:Date.now(),messages:[{id:`w1`,role:`assistant`,createdAt:Date.now(),content:`Boss พร้อมแล้ว คุยอย่างเดียว — ไม่ต้องกด Skill

ไม่มีอะไรที่ทำไม่ได้ · ไม่มีสิ่งใดที่แก้ไม่ได้

Sign in with Puter เพื่อใช้โมเดลฟรี หรือใส่ OpenRouter key (sk-or-...) เพื่อเรียกโมเดลจาก OpenRouter โดยตรง

ลอง:
- แก้บั๊กจากไฟล์ที่แนบ
- ตรวจ repo / CI
- รันโค้ดใน Sandbox แล้วส่ง error กลับมาซ่อม`}]}),y=m()(_((t,n)=>({modelId:i,modelGateway:`auto`,threads:[v()],activeThreadId:`welcome`,memory:[],setModel:e=>t({modelId:e}),setModelGateway:e=>t({modelGateway:e}),newThread:()=>{let r=e(`chat`);return t({threads:[{id:r,title:`New chat`,createdAt:Date.now(),updatedAt:Date.now(),messages:[]},...n().threads],activeThreadId:r}),r},setActiveThread:e=>t({activeThreadId:e}),pinThread:e=>t({threads:n().threads.map(t=>t.id===e?{...t,pinned:!t.pinned}:t)}),deleteThread:e=>{let r=n().threads.filter(t=>t.id!==e);t({threads:r.length?r:[v()],activeThreadId:n().activeThreadId===e?r[0]?.id??`welcome`:n().activeThreadId})},appendMessage:(r,i)=>{let a=i.id??e(`m`);return t({threads:n().threads.map(e=>{if(e.id!==r)return e;let t={id:a,createdAt:Date.now(),role:i.role,content:i.content,model:i.model,activity:i.activity,attachments:i.attachments,verified:i.verified},n=e.title===`New chat`&&i.role===`user`&&i.content.slice(0,42)||e.title;return{...e,title:n,updatedAt:Date.now(),messages:[...e.messages,t]}})}),a},patchMessage:(e,r,i)=>t({threads:n().threads.map(t=>t.id===e?{...t,updatedAt:Date.now(),messages:t.messages.map(e=>e.id===r?{...e,content:i}:e)}:t)}),patchActivity:(e,r,i)=>t({threads:n().threads.map(t=>t.id===e?{...t,updatedAt:Date.now(),messages:t.messages.map(e=>e.id===r?{...e,activity:i}:e)}:t)}),patchVerified:(e,r,i)=>t({threads:n().threads.map(t=>t.id===e?{...t,messages:t.messages.map(e=>e.id===r?{...e,verified:i}:e)}:t)}),learnMemory:r=>{let i=r.trim();if(!i)return;let a=n().memory;a.some(e=>e.text===i)||t({memory:[{id:e(`mem`),text:i,createdAt:Date.now()},...a].slice(0,48)})},removeMemory:e=>t({memory:n().memory.filter(t=>t.id!==e)})}),{name:`bossnu-slielo-store`})),b=a(),x=c.forwardRef(({className:e,...t},n)=>(0,b.jsx)(`textarea`,{className:o(`flex min-h-28 w-full rounded-md bg-elevated px-3 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 placeholder:text-subtle focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50`,e),ref:n,...t}));x.displayName=`Textarea`;var S={path:`index.html`,contents:`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bossnu sandbox</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui; background: #0b0c0e; color: #eceef2; }
      main { min-height: 100dvh; display: grid; place-items: center; }
      .card { padding: 24px; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; }
    </style>
  </head>
  <body>
    <main><div class="card"><h1>Vite starter fallback</h1><p>No project files yet. Attach files or send code to Boss.</p></div></main>
  </body>
</html>`};function C(){return S}function w(e,t){let n=e.toLowerCase();return n===`html`||n===`htm`?t:n===`css`?`<!doctype html><html><head><style>${t}</style></head><body><div class="preview">CSS loaded</div></body></html>`:`<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <pre id="out"></pre>
    <script>
      const send = (type, payload) => parent.postMessage({ source: "bossnu-sandbox", type, payload }, "*");
      const orig = { log: console.log, warn: console.warn, error: console.error };
      console.log = (...args) => { orig.log(...args); send("log", args.map(String).join(" ")); };
      console.warn = (...args) => { orig.warn(...args); send("warn", args.map(String).join(" ")); };
      console.error = (...args) => { orig.error(...args); send("error", args.map(String).join(" ")); };
      window.onerror = (message, src, line, col, err) => {
        send("runtime-error", String(err?.stack || message || "runtime error"));
        return true;
      };
      window.onunhandledrejection = (event) => {
        send("runtime-error", String(event.reason?.stack || event.reason || "unhandled rejection"));
      };
      try {
        ${t}
        send("done", { ok: true });
      } catch (error) {
        send("runtime-error", String(error && error.stack ? error.stack : error));
        send("done", { ok: false });
      }
    <\/script>
  </body>
</html>`}function T(){return typeof window<`u`&&typeof SharedArrayBuffer==`function`&&typeof crossOriginIsolated<`u`&&crossOriginIsolated}async function E(e){let t=Date.now(),n=Math.min(Math.max(e.timeoutMs??12e3,500),3e4),r=e.language.trim()||`javascript`,i=/^(js|javascript|ts|typescript|html|htm|css)$/i.test(r);if(typeof window>`u`)return{ok:!1,runtime:`unavailable`,stdout:``,stderr:`Sandbox runs in the browser only.`,logs:[],durationMs:0,error:`Sandbox runs in the browser only.`};if(!i)return{ok:!1,runtime:`unavailable`,stdout:``,stderr:`${r} is not executable in the in-browser sandbox. Use JavaScript, TypeScript-as-JS, HTML, or CSS — or attach a Vite project for preview.`,logs:[],durationMs:Date.now()-t,error:`Unsupported sandbox language: ${r}`};let a=w(r===`typescript`||r===`ts`?`javascript`:r,e.code),o=[],s=``;return new Promise(e=>{let r=document.createElement(`iframe`);r.setAttribute(`sandbox`,`allow-scripts`),r.style.position=`fixed`,r.style.left=`-9999px`,r.style.width=`1px`,r.style.height=`1px`;let i=new Blob([a],{type:`text/html`}),c=URL.createObjectURL(i),l=!1,u=(n,i)=>{l||(l=!0,window.removeEventListener(`message`,d),r.remove(),URL.revokeObjectURL(c),e({ok:n,runtime:`iframe`,stdout:o.filter(e=>e.level===`log`).map(e=>e.text).join(`
`),stderr:s||i||``,logs:o,previewHtml:a,durationMs:Date.now()-t,exitCode:+!n,...n?{}:{error:s||i||`Sandbox run failed.`}}))},d=e=>{let t=e.data;if(t&&t.source===`bossnu-sandbox`&&((t.type===`log`||t.type===`warn`||t.type===`error`)&&(o.push({level:t.type,text:String(t.payload??``)}),t.type===`error`&&(s+=`${String(t.payload??``)}\n`)),t.type===`runtime-error`&&(s+=`${String(t.payload??``)}\n`,o.push({level:`error`,text:String(t.payload??``)})),t.type===`done`)){let e=t.payload;u(!!e?.ok&&!s.trim())}};window.addEventListener(`message`,d),r.src=c,document.body.appendChild(r),window.setTimeout(()=>u(!s.trim(),s.trim()?void 0:`Sandbox timed out.`),n)})}function D(e){let t=e.find(e=>/index\.html$/i.test(e.path))??e.find(e=>/\.html$/i.test(e.path));if(t)return t.contents;let n=e.find(e=>/\.(js|mjs)$/i.test(e.path)),r=e.filter(e=>/\.css$/i.test(e.path)).map(e=>e.contents).join(`
`);return n?w(`javascript`,n.contents):r?w(`css`,r):C().contents}export{x as a,T as i,E as n,y as o,C as r,s,D as t};