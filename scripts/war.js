// --- CONFIGURATION ---
    const GYM_KEY = 'war_gym_logs';
    const APP_KEY = 'war_app_logs';
    const META_KEY = 'war_meta_logs';
    const API_KEY_STORAGE = 'war_api_url';
    let API_URL = localStorage.getItem(API_KEY_STORAGE) || "";
    let currentMode = 'WAR';

    // --- 1. SECURITY & SYNC ---

    // Helper to allow clicking the button manually
    function triggerLogin() {
        const mockEvent = { key: 'Enter' }; // Fake an 'Enter' keypress
        checkPass(mockEvent);
    }

    function checkPass(e) {
        // Only run if key is 'Enter' or if it was called manually
        if (e.key === 'Enter' || e.type === 'click') {
            const pass = document.getElementById('password').value;
            const urlInput = document.getElementById('apiUrl').value;
            
            if (pass === 'warroom') {
                // 1. Save API URL if the user typed one in
                if(urlInput && urlInput.trim() !== "") {
                    API_URL = urlInput.trim();
                    localStorage.setItem(API_KEY_STORAGE, API_URL);
                }
                
                // 2. Hide Gate, Show Dashboard
                document.getElementById('gate').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                
                // 3. Start Data Load
                if(API_URL) {
                    syncFromCloud(); // Try to get data from Google Sheet
                } else {
                    loadLocalData(); // Just load from browser storage
                }
            } else {
                // Optional: visual feedback for wrong password
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
            
            // Overwrite Local with Cloud (Cloud is Truth)
            localStorage.setItem(GYM_KEY, JSON.stringify(data.gym));
            localStorage.setItem(APP_KEY, JSON.stringify(data.hunt));
            localStorage.setItem(META_KEY, JSON.stringify(data.meta));
            
            loadLocalData(); // Render to UI
            statusEl.innerText = "✅ DATA SYNCED";
            setTimeout(() => statusEl.innerText = originalText, 2000);
            
        } catch (err) {
            console.error(err);
            statusEl.innerText = "❌ SYNC FAILED";
            loadLocalData(); // Load what we have anyway
        }
    }

    function sendToCloud(type, dataObj) {
        if(!API_URL) return; // Offline mode
        
        // Fire and forget (don't await)
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, data: dataObj })
        }).then(() => console.log("Sent to cloud"))
          .catch(e => console.error("Cloud Error", e));
    }

    // --- 2. CORE LOGIC (Modified to use SendToCloud) ---

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
            time: document.getElementById('lc_time').value,
            rule20: document.getElementById('lc_rule20').checked,
            rule12: document.getElementById('lc_rule12').checked
        };
        if(!entry.name) return alert("Enter name");

        // 1. Save Local
        const data = getGymData();
        data.unshift(entry);
        localStorage.setItem(GYM_KEY, JSON.stringify(data));
        
        // 2. Send Cloud
        sendToCloud('gym', entry);

        document.getElementById('lc_name').value = '';
        loadGymData();
        checkDailyProgress();
    }

    function loadGymData() {
        const data = getGymData();
        // Table Render
        const tbody = document.querySelector('#gymTable tbody');
        tbody.innerHTML = '';
        data.slice(0, 10).forEach(log => {
            let icon = log.status === 'Green' ? '✅' : (log.status === 'Yellow' ? '🟡' : '🔴');
            tbody.innerHTML += `<tr>
                <td>${log.date}</td>
                <td><b>${log.name}</b><br><span style="font-size:0.75rem; color:#888;">${log.difficulty}</span></td>
                <td><span class="tag">${log.topic}</span></td>
                <td>${icon} ${log.time}m</td>
                <td>${log.rule20?'⏱️':''} ${log.rule12?'⛔':''}</td>
            </tr>`;
        });
        
        // Progress Map Render
        const TOPICS = {'Arrays':9,'TwoPointers':5,'SlidingWindow':6,'Stack':7,'BinarySearch':7,'LinkedList':6,'Trees':15,'Heap':7,'Backtracking':9,'Graphs':13,'DP':12};
        const counts = {};
        data.forEach(l => counts[l.topic] = (counts[l.topic]||0)+1);
        const mapDiv = document.getElementById('progressMap');
        mapDiv.innerHTML = '';
        for(const [t, g] of Object.entries(TOPICS)) {
            const c = counts[t]||0;
            const pct = Math.min((c/g)*100, 100);
            mapDiv.innerHTML += `<div class="topic-card"><div class="topic-name">${t} (${c}/${g})</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
        }
    }

    // === HUNT LOGIC ===
    function getAppData() { return JSON.parse(localStorage.getItem(APP_KEY)) || []; }

    function logApp() {
        const entry = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            role: document.getElementById('app_role').value,
            company: document.getElementById('app_company').value,
            link: document.getElementById('app_link').value,
            type: document.getElementById('app_type').value,
            location: document.getElementById('app_loc').value,
            visa: document.getElementById('app_visa').value,
            source: document.getElementById('app_source').value,
            followup: document.getElementById('app_followup').value,
            status: document.getElementById('app_status').value,
            start2pm: document.getElementById('app_start2pm').checked,
            end4pm: document.getElementById('app_end4pm').checked,
            duration: document.getElementById('app_duration').value
        };
        if(!entry.role || !entry.company) return alert("Required fields missing");

        const data = getAppData();
        data.unshift(entry);
        localStorage.setItem(APP_KEY, JSON.stringify(data));
        
        sendToCloud('hunt', entry);

        document.getElementById('app_role').value = '';
        document.getElementById('app_company').value = '';
        loadAppData();
        checkDailyProgress();
    }

    function loadAppData() {
        const data = getAppData();
        const tbody = document.querySelector('#appTable tbody');
        if(tbody) tbody.innerHTML = '';
        
        let total=0, dream=0, interview=0, reject=0;
        const weekAgo = Date.now() - (7*24*60*60*1000);

        data.forEach(log => {
            if(tbody) {
                let style = log.status==='Interview' ? 'color:var(--neon)' : (log.status==='Rejected'?'color:var(--danger)':'color:#888');
                tbody.innerHTML += `<tr>
                    <td>${log.date}</td>
                    <td><b>${log.role}</b><br><small>${log.company}</small> ${log.start2pm?'🕑':''}</td>
                    <td>${log.type==='Dream'?'<span style="color:gold">🌟 DREAM</span>':'Survival'}</td>
                    <td>${log.visa}</td>
                    <td style="${style}">${log.status}</td>
                    <td>${log.followup || '-'}</td>
                </tr>`;
            }
            if(log.timestamp > weekAgo) {
                total++;
                if(log.type==='Dream') dream++;
                if(log.status==='Interview') interview++;
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
        container.innerHTML = logs.slice(0,3).map(l => `<div><strong style="color:var(--accent)">${l.date}:</strong> ${l.text}</div>`).join('');
    }

    // === SHARED UTILS ===
    function loadLocalData() {
        loadGymData();
        loadAppData();
        renderMetaLogs();
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
            resultDiv.style.color = "var(--neon)";
            resultDiv.style.border = "1px solid var(--neon)";
        } else {
            resultDiv.innerHTML = "MISSION PENDING...";
            resultDiv.style.color = "#888";
            resultDiv.style.border = "1px dashed #444";
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
        document.getElementById(tabId).classList.add('active');
        event.target.classList.add('active');
    }

    // Clock
    setInterval(() => {
        const now = new Date();
        const berlin = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
        document.getElementById('germanClock').innerText = berlin.toLocaleTimeString();
        const h = berlin.getHours();
        const statusEl = document.getElementById('timeStatus1');
        if(statusEl.innerText.includes("SYNCING")) return; // Don't overwrite sync msg
        if (h >= 9 && h < 12) { statusEl.innerText = "⚡ PRIME TIME"; statusEl.style.color = "var(--neon)"; }
        else if (h >= 12 && h < 18) { statusEl.innerText = "🟢 STANDARD"; statusEl.style.color = "white"; }
        else { statusEl.innerText = "💤 SLEEPING"; statusEl.style.color = "#666"; }
    }, 1000);


    setInterval(() => {
        const now = new Date();
        const uae = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dubai"}));
        document.getElementById('uaeClock').innerText = uae.toLocaleTimeString();
        const h = uae.getHours();
        const statusE4 = document.getElementById('timeStatus3');
        if (h >= 9 && h < 12) { statusE4.innerText = "⚡ PRIME TIME"; statusE4.style.color = "var(--neon)"; }
        else if (h >= 12 && h < 18) { statusE4.innerText = "🟢 STANDARD"; statusE4.style.color = "white"; }
        else { statusE4.innerText = "💤 SLEEPING"; statusE4.style.color = "#666"; }
    }, 1000);