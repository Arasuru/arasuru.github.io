// --- CONFIGURATION ---
const GYM_KEY = 'war_gym_logs';
const APP_KEY = 'war_app_logs';
const META_KEY = 'war_meta_logs';
const API_KEY_STORAGE = 'war_api_url';
const LIB_KEY = 'war_library';
const CALENDAR_KEY = 'war_calendar_tasks';
const THEME_KEY = 'war_theme';

// Default URL from your file (can be overridden in UI)
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxuJvYIH_eqbygdEDze0MmffTUsNrLM2uzZweHV3AXtxwlkrQi5OOqWpsgWIVjpZzA22g/exec";

let API_URL = localStorage.getItem(API_KEY_STORAGE) || DEFAULT_API_URL;
let currentMode = 'WAR';

// Helper for Edit Mode
let editingAppId = null; 

// helper function
function getLocalArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw || raw === "undefined") return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    // If it's an invalid date, just return the original string
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(); // Returns format like "1/22/2026" or "22.01.2026" depending on your browser
}

// --- 0. THEME LOGIC ---
function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'theme-dark';
    document.body.className = theme;
}

function setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem(THEME_KEY, themeName);
}

// --- 1. SECURITY & SYNC ---

function triggerLogin() {
    const mockEvent = { key: 'Enter' }; 
    checkPass(mockEvent);
}

function checkPass(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const pass = document.getElementById('password').value;
        const urlInput = document.getElementById('apiUrl').value;
        
        if (pass === 'warroom') {
            if(urlInput && urlInput.trim() !== "") {
                API_URL = urlInput.trim();
                localStorage.setItem(API_KEY_STORAGE, API_URL);
            } else if (!localStorage.getItem(API_KEY_STORAGE)) {
                 // Save default if nothing stored
                 localStorage.setItem(API_KEY_STORAGE, DEFAULT_API_URL);
            }
            
            document.getElementById('gate').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            loadTheme(); // Apply theme on login
            
            if(API_URL) {
                syncFromCloud(); 
            } else {
                loadLocalData(); 
                alert("Cloud data failed, loading from local");
            }
        } else {
            document.getElementById('password').style.borderColor = 'red';
        }
    }
}

// --- CLOUD FUNCTIONS ---
async function syncFromCloud() {
    const statusEl = document.getElementById('timeStatus');
    const originalText = statusEl.innerText;
    statusEl.innerText = "🔄 SYNCING DATA...";
    statusEl.style.color = "gold";

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        localStorage.setItem(GYM_KEY, JSON.stringify(data.gym));
        localStorage.setItem(APP_KEY, JSON.stringify(data.hunt));
        localStorage.setItem(META_KEY, JSON.stringify(data.meta));
        localStorage.setItem(LIB_KEY, JSON.stringify(data.library));
        loadLocalData(); 
        statusEl.innerText = "✅ DATA SYNCED";           
    } catch (err) {
        console.error(err);
        statusEl.innerText = "❌ SYNC FAILED";
        loadLocalData(); 
    }
}

function sendToCloud(type, dataObj) {
    if(!API_URL) return; 
    
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, data: dataObj })
    }).then(() => console.log("Sent to cloud"))
      .catch(e => console.error("Cloud Error", e));
}

// --- 2. CORE LOGIC ---

// === GYM LOGIC ===
function getGymData() { return JSON.parse(localStorage.getItem(GYM_KEY)) || []; }

function logGym() {
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        name: document.getElementById('lc_name').value,
        topic: document.getElementById('lc_topic').value,
        difficulty: document.getElementById('lc_diff').value,
        status: document.getElementById('lc_status').value,
        time: document.getElementById('lc_time').value
        // Removed rule20 and rule12
    };
    if(!entry.name) return alert("Enter name");

    const data = getGymData();
    data.unshift(entry);
    localStorage.setItem(GYM_KEY, JSON.stringify(data));
    
    sendToCloud('gym', entry);

    document.getElementById('lc_name').value = '';
    loadGymData();
    checkDailyProgress();
}

function loadGymData() {
    const data = getGymData();
    const tbody = document.querySelector('#gymTable tbody');
    tbody.innerHTML = '';
    data.slice(0, 10).forEach(log => {
        let icon = log.status === 'Green' ? '✅' : (log.status === 'Yellow' ? '🟡' : '🔴');
        tbody.innerHTML += `<tr>
            <td>${formatDate(log.date)}</td>
            <td><b>${log.name}</b><br><span class="text-muted small">${log.difficulty}</span></td>
            <td><span class="tag">${log.topic}</span></td>
            <td>${icon} ${log.time ? log.time + 'm' : ''}</td>
        </tr>`;
    });
    
    // Progress Map
    const TOPICS = {'Arrays':9,'TwoPointers':5,'SlidingWindow':6,'Stack':7,'BinarySearch':7,'LinkedList':6,'Trees':15,'Heap':7,'Backtracking':9,'Graphs':13,'DP':12};
    const counts = {};
    data.forEach(l => counts[l.topic] = (counts[l.topic]||0)+1);
    const mapDiv = document.getElementById('progressMap');
    mapDiv.innerHTML = '';
    for(const [t, g] of Object.entries(TOPICS)) {
        const c = counts[t]||0;
        const pct = Math.min((c/g)*100, 100);
        mapDiv.innerHTML += `<div class="topic-card">
            <div class="topic-name">${t} (${c}/${g})</div>
            <div class="progress-bar-bg"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    }
}

// === HUNT LOGIC ===
function getAppData() { return JSON.parse(localStorage.getItem(APP_KEY)) || []; }

function logApp() {
    const role = document.getElementById('app_role').value;
    const company = document.getElementById('app_company').value;
    
    if(!role || !company) return alert("Required fields missing");

    const data = getAppData();
    
    if (editingAppId) {
        // UPDATE EXISTING
        const index = data.findIndex(x => x.id === editingAppId);
        if (index > -1) {
            // Update fields but keep ID and created timestamp
            data[index].role = role;
            data[index].company = company;
            data[index].link = document.getElementById('app_link').value;
            data[index].type = document.getElementById('app_type').value;
            data[index].location = document.getElementById('app_loc').value;
            data[index].visa = document.getElementById('app_visa').value;
            data[index].source = document.getElementById('app_source').value;
            data[index].followup = document.getElementById('app_followup').value;
            data[index].status = document.getElementById('app_status').value;
            // Removed start2pm, end4pm, duration
            
            // Re-save
            localStorage.setItem(APP_KEY, JSON.stringify(data));
            sendToCloud('hunt', data[index]); // Send updated entry
            cancelEdit();
        }
    } else {
        // CREATE NEW
        const entry = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            role: role,
            company: company,
            link: document.getElementById('app_link').value,
            type: document.getElementById('app_type').value,
            location: document.getElementById('app_loc').value,
            visa: document.getElementById('app_visa').value,
            source: document.getElementById('app_source').value,
            followup: document.getElementById('app_followup').value,
            status: document.getElementById('app_status').value
        };
        
        data.unshift(entry);
        localStorage.setItem(APP_KEY, JSON.stringify(data));
        sendToCloud('hunt', entry);
        
        // Clear Form
        document.getElementById('app_role').value = '';
        document.getElementById('app_company').value = '';
        document.getElementById('app_link').value = '';
    }

    loadAppData();
    checkDailyProgress();
}

function searchApps() {
    loadAppData(); // Re-render with filter
}

function editApp(id) {
    const data = getAppData();
    const app = data.find(x => x.id === id);
    if (!app) return;

    // Populate Form
    document.getElementById('app_role').value = app.role;
    document.getElementById('app_company').value = app.company;
    document.getElementById('app_link').value = app.link || '';
    document.getElementById('app_type').value = app.type;
    document.getElementById('app_loc').value = app.location || '';
    document.getElementById('app_visa').value = app.visa;
    document.getElementById('app_source').value = app.source;
    document.getElementById('app_followup').value = app.followup || '';
    document.getElementById('app_status').value = app.status;

    // Set UI to Edit Mode
    editingAppId = id;
    document.getElementById('btn_log_app').innerText = "UPDATE APPLICATION";
    document.getElementById('btn_log_app').classList.add('btn-update');
    document.getElementById('btn_cancel_edit').style.display = 'inline-block';
    document.getElementById('huntFormPanel').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    editingAppId = null;
    document.getElementById('btn_log_app').innerText = "LOG APPLICATION";
    document.getElementById('btn_log_app').classList.remove('btn-update');
    document.getElementById('btn_cancel_edit').style.display = 'none';
    
    // Clear inputs
    document.getElementById('app_role').value = '';
    document.getElementById('app_company').value = '';
    document.getElementById('app_link').value = '';
}

function loadAppData() {
    const data = getAppData();
    const searchQuery = document.getElementById('app_search') ? document.getElementById('app_search').value.toLowerCase() : '';
    const tbody = document.querySelector('#appTable tbody');
    if(tbody) tbody.innerHTML = '';
    
    let total=0, dream=0, interview=0, reject=0;
    const weekAgo = Date.now() - (7*24*60*60*1000);

    data.forEach(log => {
        // Filter Logic
        if (searchQuery && !log.company.toLowerCase().includes(searchQuery) && !log.role.toLowerCase().includes(searchQuery)) {
            return; // Skip if doesn't match search
        }

        if(tbody) {
            let statusClass = '';
            if(log.status==='Interview') statusClass = 'text-neon';
            else if(log.status==='Rejected') statusClass = 'text-danger';
            else if(log.status==='Offer') statusClass = 'text-gold';
            else statusClass = 'text-muted';

            tbody.innerHTML += `<tr>
                <td>${formatDate(log.date)}</td>
                <td><b>${log.role}</b><br><small class="text-muted">${log.company}</small></td>
                <td>${log.type==='Dream'?'<span class="text-gold">🌟 DREAM</span>':'Survival'}</td>
                <td class="${statusClass} bold">${log.status}</td>
                <td>${log.followup || '-'}</td>
                <td><button class="action-btn small-btn" onclick="editApp(${log.id})">✏️</button></td>
            </tr>`;
        }
        if(log.timestamp > weekAgo) {
            total++;
            if(log.type==='Dream') dream++;
            if(log.status==='Interview' || log.status==='Offer') interview++;
            if(log.status==='Rejected') reject++;
        }
    });
    
    if(document.getElementById('stat_total')) {
        document.getElementById('stat_total').innerText = total;
        document.getElementById('stat_dream').innerText = dream;
        document.getElementById('stat_reject').innerText = reject;
        document.getElementById('stat_interview').innerText = (total>0 ? Math.round((interview/total)*100) : 0) + '%';
    }
}

// === META LOGIC ===
function saveMetaLog() {
    const text = document.getElementById('meta_log').value;
    if(!text) return;
    const entry = { date: new Date().toLocaleDateString(), text: text };
    
    const logs = JSON.parse(localStorage.getItem(META_KEY)) || [];
    logs.unshift(entry);
    localStorage.setItem(META_KEY, JSON.stringify(logs));
    
    sendToCloud('meta', entry);
    
    document.getElementById('meta_log').value = '';
    renderMetaLogs();
}

function renderMetaLogs() {
    const logs = JSON.parse(localStorage.getItem(META_KEY)) || [];
    const container = document.getElementById('saved_logs');
    container.innerHTML = logs.slice(0,3).map(l => `<div class="log-entry"><strong class="accent-text">${l.date}:</strong> ${l.text}</div>`).join('');
}

// === SHARED UTILS ===
function loadLocalData() {
    loadGymData();
    loadAppData();
    renderMetaLogs();
    renderLibrary();
    if(document.getElementById('cal_grid')) {
         initCalendar(); 
         renderTaskList();
    }
    checkDailyProgress();
    calculateStreaks();
}

function checkDailyProgress() {
    const todayStr = new Date().toLocaleDateString();
    const gymCount = getGymData().filter(l => l.date === todayStr).length;
    const appCount = getAppData().filter(l => l.date === todayStr).length;
    
    const gTarget = currentMode === 'WAR' ? 2 : 1;
    const aTarget = currentMode === 'WAR' ? 5 : 1;
    
    document.getElementById('score_gym').innerText = `${gymCount} / ${gTarget}`;
    document.getElementById('bar_gym').style.width = Math.min((gymCount/gTarget)*100, 100) + '%';
    
    document.getElementById('score_hunt').innerText = `${appCount} / ${aTarget}`;
    document.getElementById('bar_hunt').style.width = Math.min((appCount/aTarget)*100, 100) + '%';
    
    const resultDiv = document.getElementById('day_result');
    if(gymCount >= gTarget && appCount >= aTarget) {
        resultDiv.innerHTML = "MISSION ACCOMPLISHED ✅";
        resultDiv.className = "mission-status success";
    } else {
        resultDiv.innerHTML = "MISSION PENDING...";
        resultDiv.className = "mission-status pending";
    }
}

function calculateStreaks() {
    const dates = new Set([...getGymData(), ...getAppData()].map(x => x.date));
    document.getElementById('streak_current').innerText = dates.size;
}

function toggleMode() {
    const btn = document.getElementById('modeToggle');
    currentMode = currentMode === 'WAR' ? 'MVP' : 'WAR';
    btn.innerText = `MODE: ${currentMode === 'WAR' ? '🔥 WAR' : '💤 MVP'}`;
    checkDailyProgress();
}

function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    if(tabId === 'calendar') setTimeout(initCalendar, 100); 
    document.getElementById(tabId).classList.add('active');
    
    // Find button that triggered this or match by text/onclick
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        if(b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
    });
}

// Clocks
setInterval(() => {
    const now = new Date();
    const berlin = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
    document.getElementById('germanClock').innerText = berlin.toLocaleTimeString();
    const h = berlin.getHours();
    const statusEl = document.getElementById('timeStatus1');
    if(statusEl.innerText.includes("SYNCING")) return; 
    
    if (h >= 9 && h < 12) { statusEl.innerText = "⚡ PRIME TIME"; statusEl.style.color = "var(--neon)"; }
    else if (h >= 12 && h < 18) { statusEl.innerText = "🟢 STANDARD"; statusEl.style.color = "var(--text)"; }
    else { statusEl.innerText = "💤 SLEEPING"; statusEl.style.color = "var(--muted)"; }
}, 1000);


setInterval(() => {
    const now = new Date();
    const uae = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dubai"}));
    document.getElementById('uaeClock').innerText = uae.toLocaleTimeString();
    const h = uae.getHours();
    const statusE4 = document.getElementById('timeStatus3');
    if (h >= 9 && h < 12) { statusE4.innerText = "⚡ PRIME TIME"; statusE4.style.color = "var(--neon)"; }
    else if (h >= 12 && h < 18) { statusE4.innerText = "🟢 STANDARD"; statusE4.style.color = "var(--text)"; }
    else { statusE4.innerText = "💤 SLEEPING"; statusE4.style.color = "var(--muted)"; }
}, 1000);

// === BLOCK 4: CALENDAR LOGIC ===
let currentDate = new Date(); 
let selectedDateKey = null;   

function getCalendarData() { return JSON.parse(localStorage.getItem(CALENDAR_KEY)) || {}; }

function initCalendar() {
    renderCalendarGrid();
    selectDate(new Date().toISOString().split('T')[0]);
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendarGrid();
}

function renderCalendarGrid() {
    const grid = document.getElementById('cal_grid');
    const monthDisplay = document.getElementById('cal_month_year');
    const tasks = getCalendarData();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    monthDisplay.innerText = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    days.forEach(d => grid.innerHTML += `<div class="cal-header">${d}</div>`);

    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }

    const todayKey = new Date().toISOString().split('T')[0];
    
    for(let d=1; d<=daysInMonth; d++) {
        const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        
        const dayTasks = tasks[dateKey] || [];
        const hasTasks = dayTasks.length > 0;
        const isToday = dateKey === todayKey;
        const isSelected = dateKey === selectedDateKey;

        let dotHtml = hasTasks ? `<div class="cal-dot"></div>` : '';
        
        const div = document.createElement('div');
        div.className = `cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
        div.innerHTML = `<span class="day-num">${d}</span> ${dotHtml}`;
        div.onclick = () => selectDate(dateKey);
        
        grid.appendChild(div);
    }
}

function selectDate(dateKey) {
    selectedDateKey = dateKey;
    renderCalendarGrid(); 
    renderTaskList();
}

function renderTaskList() {
    const list = document.getElementById('task_list');
    const display = document.getElementById('selected_date_display');
    const tasks = getCalendarData();
    const dayTasks = tasks[selectedDateKey] || [];

    const dateObj = new Date(selectedDateKey);
    display.innerText = dateObj.toDateString();

    list.innerHTML = '';
    if(dayTasks.length === 0) {
        list.innerHTML = '<div class="no-tasks">No missions for this day.</div>';
        return;
    }
    dayTasks.forEach((task, index) => {
        const check = task.done ? '☑️' : '⬜';
        const doneClass = task.done ? 'task-done' : '';
        
        list.innerHTML += `
            <div class="task-item">
                <div onclick="toggleTask(${index})" class="task-content">
                    <span class="mr-5">${check}</span>
                    <span class="${doneClass}">${task.text}</span>
                </div>
                <button onclick="deleteTask(${index})" class="delete-btn">&times;</button>
            </div>
        `;
    });
}

function addTask() {
    const input = document.getElementById('new_task_input');
    const text = input.value.trim();
    if(!text || !selectedDateKey) return;

    const data = getCalendarData();
    if(!data[selectedDateKey]) data[selectedDateKey] = [];
    
    data[selectedDateKey].push({ text: text, done: false });
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(data));
    
    if(typeof sendToCloud === 'function') sendToCloud('calendar', { date: selectedDateKey, tasks: data[selectedDateKey] });

    input.value = '';
    renderTaskList();
    renderCalendarGrid(); 
}

function toggleTask(index) {
    const data = getCalendarData();
    data[selectedDateKey][index].done = !data[selectedDateKey][index].done;
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(data));
    renderTaskList();
}

function deleteTask(index) {
    const data = getCalendarData();
    data[selectedDateKey].splice(index, 1);
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(data));
    renderTaskList();
    renderCalendarGrid();
}

function handleTaskEnter(e) {
    if(e.key === 'Enter') addTask();
}

// === LIBRARY LOGIC ===
function addLibraryItem() {
    const title = document.getElementById('lib_title').value;
    const url = document.getElementById('lib_url').value;
    const tag = document.getElementById('lib_tag').value;
    if(!title || !url) return;

    const entry = { title, url, tag }; 

    const data = getLocalArray(LIB_KEY);
    data.unshift(entry);
    localStorage.setItem(LIB_KEY, JSON.stringify(data));
    
    sendToCloud('library', entry); 
    
    document.getElementById('lib_title').value = '';
    document.getElementById('lib_url').value = '';
    renderLibrary();
}

function renderLibrary() {
    const data = getLocalArray(LIB_KEY);
    const list = document.getElementById('library_list');
    if(!list) return;

    if(data.length === 0) {
        list.innerHTML = '<div class="no-lib">Library is empty.</div>';
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="lib-card">
            <span class="lib-tag">${item.tag}</span>
            <div class="mb-5">
                <a href="${item.url}" target="_blank" class="lib-link">
                    ${item.title} 🔗
                </a>
            </div>
            <div class="lib-url">${item.url}</div>
        </div>
    `).join('');
}