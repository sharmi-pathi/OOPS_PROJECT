/* ---------- CONFIG ---------- */
// If you stand up the Spring Boot backend, set to true and adjust BASE_URL if needed.
const USE_BACKEND = false;
const BASE_URL = 'http://localhost:8080/api';

const LS_USERS = 'tb_users_v1';
const LS_FOUND = 'tb_found_v1';
const LS_LOST = 'tb_lost_v1';
const LS_HISTORY = 'tb_history_v1';

/* ---------- App state ---------- */
let users = {};         // username -> password (local copy)
let currentUser = null; // currently logged-in username
let foundItems = [];    // array of reported found items (objects)
let lostItems = [];     // array of reported lost items (objects)
let historyLog = [];    // array of {type, item, when}

/* ---------- Initialization ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocal();
  hookPreviewInputs();
  updateBackendStatus();
  renderDashboardHistories();
});

/* ---------- Persistence helpers (localStorage) ---------- */
function loadFromLocal(){
  try {
    users = JSON.parse(localStorage.getItem(LS_USERS) || '{}');
    foundItems = JSON.parse(localStorage.getItem(LS_FOUND) || '[]');
    lostItems = JSON.parse(localStorage.getItem(LS_LOST) || '[]');
    historyLog = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  } catch(e){
    users = {}; foundItems = []; lostItems = []; historyLog = [];
  }
}

function saveToLocal(){
  localStorage.setItem(LS_USERS, JSON.stringify(users));
  localStorage.setItem(LS_FOUND, JSON.stringify(foundItems));
  localStorage.setItem(LS_LOST, JSON.stringify(lostItems));
  localStorage.setItem(LS_HISTORY, JSON.stringify(historyLog));
}

/* ---------- AUTH UI ---------- */
function toggleAuth(type){
  const loginBox = document.getElementById('loginBox');
  const signupBox = document.getElementById('signupBox');
  if(type === 'signup'){
    loginBox.classList.remove('active');
    signupBox.classList.add('active');
  } else {
    signupBox.classList.remove('active');
    loginBox.classList.add('active');
  }
}

/* ---------- Signup - local (and optionally backend) ---------- */
async function signup(){
  const u = document.getElementById('signupUser').value.trim();
  const p = document.getElementById('signupPass').value.trim();
  if(!u || !p){ showToast('Please enter username & password 🙏'); return; }

  if(USE_BACKEND){
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: u, password: p })
      });
      const js = await res.json();
      if(res.ok){
        showToast('✨ Account created! Please login.');
        toggleAuth('login');
      } else {
        showToast(js.message || 'Signup failed 😅');
      }
    } catch(e){ showToast('Backend signup error'); }
    return;
  }

  // local mode:
  if(users[u]){ showToast('Username already exists! Try another 😅'); return; }
  users[u] = p;
  saveToLocal();
  showToast('✨ Account created! Please login.');
  document.getElementById('signupUser').value = '';
  document.getElementById('signupPass').value = '';
  toggleAuth('login');
}

/* ---------- Login ---------- */
async function login(){
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  if(!u || !p){ showToast('Enter username & password 👀'); return; }

  if(USE_BACKEND){
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: u, password: p })
      });
      const js = await res.json();
      if(res.ok){
        currentUser = u;
        enterApp();
      } else {
        showToast(js.message || 'Invalid credentials ❌');
      }
    } catch(e){
      showToast('Backend login error ❌');
    }
    return;
  }

  if(users[u] && users[u] === p){
    currentUser = u;
    enterApp();
  } else {
    showToast('Invalid credentials ❌');
  }
}

/* ---------- Show main app after login ---------- */
function enterApp(){
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  document.getElementById('userDisplay').innerText = `Hi, ${currentUser} 👋`;
  document.getElementById('userName').innerText = currentUser;
  document.getElementById('profileName').innerText = currentUser;
  showSection('dashboard');
  showToast(`Welcome back, ${currentUser} 🌟`);
  renderDashboardHistories();
}

/* ---------- Logout ---------- */
function logout(){
  currentUser = null;
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  showToast('Logged out 👋');
}

/* ---------- Sections ---------- */
function showSection(id){
  document.querySelectorAll('.panel').forEach(s => s.classList.remove('active'));
  const panel = document.getElementById(id);
  if(panel) panel.classList.add('active');
}

/* ---------- Image preview helpers ---------- */
function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = e => rej(e);
    r.readAsDataURL(file);
  });
}

function showPreview(inputEl, previewElId){
  const preview = document.getElementById(previewElId);
  preview.innerHTML = '';
  const file = inputEl.files && inputEl.files[0];
  if(!file){ preview.classList.add('hidden'); return; }
  readFileAsDataURL(file).then(dataUrl => {
    const img = document.createElement('img');
    img.src = dataUrl;
    preview.appendChild(img);
    preview.classList.remove('hidden');
  }).catch(()=>{/* ignore */});
}

function hookPreviewInputs(){
  const found = document.getElementById('foundImage');
  const lost = document.getElementById('lostImage');
  found && found.addEventListener('change', e => showPreview(e.target, 'foundPreview'));
  lost && lost.addEventListener('change', e => showPreview(e.target, 'lostPreview'));

  // hook forms
  document.getElementById('foundForm').addEventListener('submit', async (evt) => {
    evt.preventDefault();
    await handleReport('found');
  });
  document.getElementById('lostForm').addEventListener('submit', async (evt) => {
    evt.preventDefault();
    await handleReport('lost');
  });
}

/* ---------- Report handler (found/lost) ---------- */
async function handleReport(kind){
  if(!currentUser){ showToast('Please login to report ✨'); return; }

  const name = document.getElementById(kind+'Name').value.trim();
  if(!name){ showToast('Please provide item name'); return; }
  const description = document.getElementById(kind+'Description').value.trim();
  const location = document.getElementById(kind+'Location').value.trim();
  const contact = document.getElementById(kind+'Contact').value.trim();
  const inputFile = document.getElementById(kind+'Image').files[0];

  let imageData = null;
  if(inputFile){
    imageData = await readFileAsDataURL(inputFile);
  }

  const item = {
    id: Date.now().toString(),
    name, description, location, contact, imageData,
    reporter: currentUser, createdAt: new Date().toISOString(), kind
  };

  if(USE_BACKEND){
    // call backend REST
    try {
      const res = await fetch(`${BASE_URL}/items/report`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(item)
      });
      const js = await res.json();
      if(res.ok){
        showToast((kind==='found' ? '✅ Found item' : '❌ Lost item') + ` "${name}" reported!`);
        // local copy sync: optional fetch of all items
        await fetchAllFromBackend();
      } else {
        showToast(js.message || 'Report failed 😕');
      }
    } catch(e){
      showToast('Backend report error ❌');
    }
    // reset fields
    document.getElementById(kind+'Form').reset();
    document.getElementById(kind+'Preview').classList.add('hidden');
    return;
  }

  // local mode
  if(kind === 'found') foundItems.push(item); else lostItems.push(item);
  historyLog.unshift({ type: kind, item: item, when: new Date().toISOString() });
  // keep history trimmed to 200
  if(historyLog.length > 200) historyLog = historyLog.slice(0,200);
  saveToLocal();
  showToast((kind==='found' ? '✅ Found item' : '❌ Lost item') + ` "${name}" reported!`);
  checkMatches(item, (kind === 'found') ? lostItems : foundItems);
  document.getElementById(kind+'Form').reset();
  document.getElementById(kind+'Preview').classList.add('hidden');
  renderDashboardHistories();
}

/* ---------- Search ---------- */
function searchItem(){
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const locFilter = (document.getElementById('searchLocation').value || '').toLowerCase();
  const combined = [...foundItems, ...lostItems];
  const results = combined.filter(i => {
    const matchName = i.name.toLowerCase().includes(q || '');
    const matchLoc = !locFilter || (i.location && i.location.toLowerCase().includes(locFilter));
    return matchName && matchLoc;
  });
  const out = document.getElementById('searchResults');
  out.innerHTML = '';
  if(results.length === 0){
    out.innerHTML = `<p class="small">No results found 😢</p>`;
    return;
  }
  results.forEach(it => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${escapeHtml(it.name)}</h3>
      <p>${escapeHtml(it.description || '')}</p>
      <p class="small"><strong>Location:</strong> ${escapeHtml(it.location || '—')}</p>
      <p class="small"><strong>Contact:</strong> ${escapeHtml(it.contact || '—')}</p>
      <p class="small"><strong>Type:</strong> ${it.kind === 'found' ? 'Found ✅' : 'Lost ❌'}</p>
      ${it.imageData ? `<img src="${it.imageData}" alt="preview" style="width:100%;border-radius:8px;margin-top:8px">` : ''}
      <p class="small">Reported by: ${escapeHtml(it.reporter)}</p>
    `;
    out.appendChild(card);
  });
}

/* ---------- Matching logic ---------- */
/* If names match (case-insensitive), send a notification */
function checkMatches(newItem, oppositeList){
  oppositeList.forEach(other => {
    if(!other.name) return;
    if(newItem.name.trim().toLowerCase() === other.name.trim().toLowerCase()){
      if(newItem.kind === 'found'){
        showToast(`🎉 Match! Found "${newItem.name}" — reported lost by ${other.reporter}. Contact them: ${other.contact}`);
      } else {
        showToast(`🎉 Match! Lost "${newItem.name}" — reported found by ${other.reporter}. Contact: ${other.contact}`);
      }
    }
  });
}

/* ---------- UI: History rendering ---------- */
function renderDashboardHistories(){
  // user history
  const userHistoryEl = document.getElementById('userHistory');
  const globalHistoryEl = document.getElementById('globalHistory');

  if(!userHistoryEl || !globalHistoryEl) return;

  if(currentUser){
    const userEvents = historyLog.filter(h => h.item.reporter === currentUser).slice(0,20);
    if(userEvents.length === 0) userHistoryEl.innerHTML = `<p class="small">You have no history yet.</p>`;
    else userHistoryEl.innerHTML = userEvents.map(ev => {
      const t = new Date(ev.when).toLocaleString();
      return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.02)"><strong>${ev.type.toUpperCase()}</strong> — ${escapeHtml(ev.item.name)}<br><span class="small">${escapeHtml(ev.item.location||'—')} • ${t}</span></div>`;
    }).join('');
  } else {
    userHistoryEl.innerHTML = `<p class="small">Login to see your history.</p>`;
  }

  // global recent reports (found + lost)
  const combined = [...foundItems, ...lostItems].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)).slice(0,25);
  if(combined.length === 0) globalHistoryEl.innerHTML = `<p class="small">No reports yet.</p>`;
  else globalHistoryEl.innerHTML = combined.map(it => {
    const t = new Date(it.createdAt).toLocaleString();
    return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.02)"><strong>${it.kind === 'found' ? 'Found' : 'Lost'}</strong> — ${escapeHtml(it.name)}<br><span class="small">${escapeHtml(it.reporter)} • ${escapeHtml(it.location||'—')} • ${t}</span></div>`;
  }).join('');
}

/* ---------- Notifications (toasts) ---------- */
function showToast(message, ms = 4500){
  const container = document.getElementById('notif-container');
  const el = document.createElement('div');
  el.className = 'notif';
  el.innerText = message;
  container.appendChild(el);
  setTimeout(()=> {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(()=> el.remove(), 300);
  }, ms);
}

/* ---------- small helpers ---------- */
function escapeHtml(text){
  if(!text) return '';
  return text.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
}

/* ---------- Backend helper (optional) ---------- */
async function fetchAllFromBackend(){
  if(!USE_BACKEND) return;
  try {
    const res = await fetch(`${BASE_URL}/items/all`);
    if(res.ok){
      const js = await res.json();
      // separate into found/lost and also update history from backend results
      foundItems = js.filter(i=> i.kind === 'found');
      lostItems = js.filter(i=> i.kind === 'lost');
      // rebuild local history from items (server is source of truth)
      historyLog = js.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).map(i => ({ type: i.kind, item: i, when: i.createdAt }));
      saveToLocal();
      renderDashboardHistories();
    }
  } catch(e){ console.warn('fetchAllFromBackend failed', e); }
}

function updateBackendStatus(){
  const el = document.getElementById('backendStatus');
  el && (el.innerText = USE_BACKEND ? 'Backend mode enabled (REST)' : 'Local storage (default)');
  // optionally fetch backend items
  if(USE_BACKEND) fetchAllFromBackend();
}
