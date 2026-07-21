// CG Tagging Tool — Complete Refactored Frontend (Node + Static Compatible)

// PDF.js worker setup
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

// DOM Elements
const stageSelect          = document.getElementById('stage-select');
const coreSelect           = document.getElementById('core-select');
const refreshCoreBtn       = document.getElementById('refresh-core-btn');
const fixedFileName        = document.getElementById('fixed-file-name');
const dropZone             = document.getElementById('drop-zone');
const fileInput            = document.getElementById('file-input');
const uploadedFileStatus   = document.getElementById('uploaded-file-status');
const removeFileBtn        = document.getElementById('remove-file-btn');
const textPreviewContainer = document.getElementById('text-preview-container');
const extractedTextPreview = document.getElementById('extracted-text-preview');
const analyzeBtn           = document.getElementById('analyze-btn');
const loadingOverlay       = document.getElementById('loading-overlay');
const loadingMsg           = document.getElementById('loading-msg');
const resultsPlaceholder   = document.getElementById('results-placeholder');
const resultsContainer     = document.getElementById('results-container');
const chatMessages         = document.getElementById('chat-messages');
const chatInput            = document.getElementById('chat-input');
const chatSendBtn          = document.getElementById('chat-send-btn');
const historyBtn           = document.getElementById('history-btn');
const historyPanel         = document.getElementById('history-panel');

// NCF Tracker DOM elements
const trackerWidget             = document.getElementById('tracker-widget');
const resetTrackerBtn           = document.getElementById('reset-tracker-btn');
const trackerChaptersCount      = document.getElementById('tracker-chapters-count');
const trackerCompetencyCount    = document.getElementById('tracker-competency-count');
const trackerProgressBar        = document.getElementById('tracker-progress-bar');
const toggleTrackerDetailsBtn   = document.getElementById('toggle-tracker-details-btn');
const trackerDetailsPanel       = document.getElementById('tracker-details-panel');
const trackerMatrixGrid         = document.getElementById('tracker-matrix-grid');
const trackerSkillsDistribution = document.getElementById('tracker-skills-distribution');

// Safe localStorage wrapper
function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage full or unavailable, clearing chat log cache...');
        try {
            localStorage.removeItem('cgChatLog');
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (err) {
            console.error('LocalStorage write failed:', err);
        }
    }
}

function safeGetStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

let conversationLog = [];
try {
    conversationLog = JSON.parse(safeGetStorage('cgChatLog') || '[]');
} catch (e) {
    conversationLog = [];
}

// Hardcoded Stages Configuration
const STAGES_CONFIG = {
    "01. Foundational": ["F.CG.pdf"],
    "02. Preparatory": ["Art P.CG.pdf", "EVS P.CG.pdf", "English P.CG.pdf", "Hindi P.CG.pdf", "Maths P.CG.pdf", "SST P.CG.pdf", "Science P.CG.pdf"],
    "03. Middle": ["ART M.CG.pdf", "English M.CG.pdf", "Hindi M.CG.pdf", "Maths M.CG.pdf", "SST M.CG.pdf", "Sanskrit M.CG.pdf", "Science M.CG.pdf"]
};

// Initial Pre-populated Tracker Data for Chapters 11, 12, 13
const INITIAL_TRACKER_DATA = {
  "chapters": {
    "11.pdf": [
      {
        "pageNumber": "105",
        "activityName": "Learning Through Interaction (Interview trainer)",
        "competencyCode": "CG-1, C-1.2",
        "skillName": "Communication",
        "coreCompetencyText": "Listens to, plans, and conducts different kinds of interviews (structured and unstructured)",
        "coreCompetencyHindi": "विभिन्न प्रकार के साक्षात्कारों को सुनना, उनकी योजना बनाना और उन्हें आयोजित करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "इस गतिविधि में छात्रों को किसी स्पोर्ट्स कोच का साक्षात्कार लेना है। यह सीधा C-1.2 के अंतर्गत आता है। पाठ्यपुस्तक में इसके लिए कोई टैग मुद्रित नहीं था।"
      },
      {
        "pageNumber": "106",
        "activityName": "Story Journey (OMR Comprehension Questions)",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक सुनने या पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "छात्रों को कहानी पढ़ने के बाद MCQs के उत्तर देने हैं, जिससे वे पाठ से मुख्य बिंदुओं की पहचान कर सकें। यह C-1.1 का हिस्सा है।"
      }
    ],
    "12.pdf": [
      {
        "pageNumber": "115",
        "activityName": "Homage Table (Wonder Window)",
        "competencyCode": "CG-2, C-2.3",
        "skillName": "Social and Cross-Cultural Interaction",
        "coreCompetencyText": "Expresses through speech and writing their ideas and critiques on social/cultural surroundings",
        "coreCompetencyHindi": "अपने सामाजिक और सांस्कृतिक परिवेश पर विचारों को व्यक्त करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "शहीदों के सम्मान में विचार साझा करना C-2.3 और Social Interaction को मजबूत करता है।"
      }
    ]
  }
};

let state = {
    selectedStage: '',
    selectedCoreFile: '',
    uploadedText: '',
    uploadedFilename: '',
    analysisReady: false,
    chatHistory: [],
    coreTextCache: '',
    skillsTextCache: ''
};

// ─── INIT ────────────────────────────────────────────────────────────────────
loadStages();
loadFixedSkills();
updateTrackerUI();
resetChat();

function esc(str) { return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

// Populate dropdown 1: Select Stage
function loadStages() {
    if (!stageSelect) return;
    stageSelect.innerHTML = '<option value="">-- Select Stage --</option>';
    Object.keys(STAGES_CONFIG).forEach(stg => {
        const opt = document.createElement('option');
        opt.value = stg;
        opt.textContent = stg;
        stageSelect.appendChild(opt);
    });
}

// Stage selected -> Load core dropdown
if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        state.selectedStage = val;
        coreSelect.innerHTML = '';
        coreSelect.disabled = !val;

        if (!val) {
            coreSelect.innerHTML = '<option value="">-- First select a Stage --</option>';
            checkReady();
            return;
        }

        coreSelect.innerHTML = '<option value="">-- Select Subject CG File --</option>';
        STAGES_CONFIG[val].forEach(file => {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file;
            coreSelect.appendChild(opt);
        });
        checkReady();
    });
}

if (coreSelect) {
    coreSelect.addEventListener('change', async (e) => {
        state.selectedCoreFile = e.target.value;
        if (state.selectedCoreFile) {
            showLoading(true, '📚 Loading curriculum text...');
            try {
                const res = await fetch(`./cache/${encodeURIComponent(state.selectedCoreFile)}.txt`);
                if (!res.ok) throw new Error('Curriculum cache not found');
                state.coreTextCache = await res.text();
            } catch (err) {
                console.warn('Error loading core file cache:', err);
                state.coreTextCache = `English Middle Stage Curriculum Goals:
CG-1: Listening and Speaking (C-1.1, C-1.2, C-1.3, C-1.4, C-1.5)
CG-2: Reading and Writing (C-2.1, C-2.2, C-2.3)
CG-3: Linguistic Rules (C-3.1, C-3.2)
CG-4: Research & Resource Usage (C-4.1, C-4.2)
CG-5: Wordplays & Puns (C-5.1, C-5.2, C-5.3)`;
            } finally {
                showLoading(false);
            }
        } else {
            state.coreTextCache = '';
        }
        checkReady();
    });
}

async function loadFixedSkills() {
    try {
        const res = await fetch('./cache/21st Century Skill.pdf.txt');
        if (!res.ok) throw new Error('Skills cache not found');
        state.skillsTextCache = await res.text();
    } catch (e) {
        console.warn('Error loading skills file:', e);
        state.skillsTextCache = 'Official 21st Century Skills: Critical Thinking, Creativity, Collaboration, Communication, Information Literacy, Media Literacy, Technology Literacy.';
    }
}

// ─── DRAG & DROP ─────────────────────────────────────────────────────────────
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileUpload(files[0]);
    });

    dropZone.addEventListener('click', () => fileInput && fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
}

async function handleFileUpload(file) {
    showLoading(true, '📄 Reading PDF and preparing text...');
    try {
        state.uploadedFilename = file.name;
        
        let text = '';
        try {
            const cacheRes = await fetch(`./cache/${encodeURIComponent(file.name)}.txt`);
            if (cacheRes.ok) {
                text = await cacheRes.text();
            }
        } catch (cacheErr) {
            console.warn('Cache fetch failed:', cacheErr);
        }

        if (!text) {
            if (file.name.toLowerCase().endsWith('.pdf') && typeof pdfjsLib !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map(item => item.str).join(' ');
                    text += `\n--- Page ${i} ---\n` + pageText;
                }
            } else {
                text = await file.text();
            }
        }

        state.uploadedText = text;
        state.analysisReady = false;

        const nameLabel = document.querySelector('.file-name-text');
        if (nameLabel) nameLabel.textContent = file.name;
        if (uploadedFileStatus) uploadedFileStatus.style.display = 'flex';
        if (dropZone) dropZone.style.display = 'none';
        checkReady();
    } catch (e) {
        alert('File read failed: ' + e.message);
    } finally {
        showLoading(false);
    }
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        state.uploadedText = '';
        state.uploadedFilename = '';
        state.analysisReady = false;
        if (fileInput) fileInput.value = '';
        if (uploadedFileStatus) uploadedFileStatus.style.display = 'none';
        if (dropZone) dropZone.style.display = 'flex';
        checkReady();
        resetChat();
    });
}

function checkReady() {
    const ready = !!(state.selectedStage && state.selectedCoreFile && state.uploadedText);
    if (analyzeBtn) analyzeBtn.disabled = !ready;
}

function showLoading(show, msg) {
    if (loadingOverlay) loadingOverlay.style.display = show ? 'flex' : 'none';
    if (loadingMsg) loadingMsg.textContent = msg || 'Loading...';
}

// ─── CHAT FLOW ───────────────────────────────────────────────────────────────
function addChatBubble(sender, text) {
    if (!chatMessages) return null;
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${sender}-container`;
    const b = document.createElement('div');
    b.className = `chat-bubble ${sender}-bubble`;
    b.innerHTML = `<span style="color:${sender==='user'?'#81c784':'#ffd166'}; font-weight:bold;">${sender==='user'?'Teacher: ':'AI Auditor: '}</span>` + (sender === 'user' ? esc(text) : text);
    container.appendChild(b);
    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return container;
}

function resetChat() {
    state.chatHistory = [];
    state.analysisReady = false;
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (resultsPlaceholder) resultsPlaceholder.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'none';
}

if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMsg(); });
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMsg);

async function sendChatMsg() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatBubble('user', text);
    chatInput.value = '';
    state.chatHistory.push({ role: 'user', content: text });
    
    conversationLog.push({ user: text, bot: null });
    safeSetStorage('cgChatLog', conversationLog);

    const thinkingBubble = addChatBubble('ai', '⏳ Analyzing curriculum & activity text...');

    try {
        let replyText = '';
        let taggingData = null;
        let cleanReply = '';

        // Try calling backend endpoint first (/api/chat)
        let backendSuccess = false;
        try {
            const apiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: state.chatHistory.slice(0, -1),
                    message: text,
                    context: {
                        coreFileRelativePath: state.selectedStage ? `${state.selectedStage}/${state.selectedCoreFile}` : '',
                        uploadedText: state.uploadedText,
                        uploadedFilename: state.uploadedFilename
                    }
                })
            });

            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.reply) {
                    cleanReply = apiData.reply;
                    taggingData = apiData.taggingData;
                    backendSuccess = true;
                }
            }
        } catch (serverErr) {
            console.warn('Backend server not reachable, falling back to direct AI call:', serverErr);
        }

        // Fallback: direct Pollinations API call if server is not running
        if (!backendSuccess) {
            const systemPrompt = `You are the Expert Academic Auditor for a Class 7 English textbook. Perform NCF curriculum tagging.
Follow all guidelines: output detailed reasoning in Hinglish, then JSON block wrapped in <<<JSON>>> and <<<END>>>.`;

            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...state.chatHistory
                    ],
                    model: 'openai'
                })
            });

            if (!response.ok) throw new Error(`AI Service returned HTTP ${response.status}`);
            replyText = await response.text();

            const jsonMatch = replyText.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/);
            cleanReply = replyText;

            if (jsonMatch) {
                try {
                    taggingData = JSON.parse(jsonMatch[1].trim());
                    cleanReply = "Done! Working Area mein details update ho gayi hain. Ab aur kahan tagging karani hai?";
                } catch (jsonErr) {
                    console.error('JSON parse failed:', jsonErr);
                }
            }
        }

        // Remove thinking bubble and show clean response
        if (thinkingBubble) thinkingBubble.remove();
        addChatBubble('ai', cleanReply);
        state.chatHistory.push({ role: 'assistant', content: cleanReply });

        if (taggingData && taggingData.activities && taggingData.activities.length > 0) {
            saveTrackerLocal(state.uploadedFilename, taggingData.activities);
            renderResults(taggingData.activities, true);
            updateTrackerUI();
        }

    } catch (e) {
        if (thinkingBubble) thinkingBubble.remove();
        addChatBubble('ai', '⚠️ Error: ' + e.message);
    }
}

// ─── TRACKER & LOCAL STORAGE ──────────────────────────────────────────────────
function getTrackerLocal() {
    let trk = safeGetStorage('ncf_tracker');
    if (!trk) {
        safeSetStorage('ncf_tracker', INITIAL_TRACKER_DATA);
        return INITIAL_TRACKER_DATA;
    }
    try {
        return JSON.parse(trk);
    } catch (e) {
        return INITIAL_TRACKER_DATA;
    }
}

function saveTrackerLocal(filename, newActivities) {
    if (!filename) return;
    let tracker = getTrackerLocal();
    if (!tracker.chapters) tracker.chapters = {};
    if (!tracker.chapters[filename]) {
        tracker.chapters[filename] = [];
    }
    
    newActivities.forEach(newAct => {
        const idx = tracker.chapters[filename].findIndex(a => a.activityName === newAct.activityName);
        if (idx !== -1) {
            tracker.chapters[filename][idx] = newAct;
        } else {
            tracker.chapters[filename].push(newAct);
        }
    });
    
    safeSetStorage('ncf_tracker', tracker);
}

async function updateTrackerUI() {
    try {
        const data = getTrackerLocal();
        const auditedChapters = Object.keys(data.chapters || {});

        const allCompetencies = [
            { code: "1.1", desc: "C-1.1: Identifies main points and summarises from a careful listening or reading of text" },
            { code: "1.2", desc: "C-1.2: Listens to, plans, and conducts different kinds of interviews" },
            { code: "1.3", desc: "C-1.3: Raises probing questions about social experiences using appropriate language" },
            { code: "1.4", desc: "C-1.4: Writes different kinds of letters, essays, and reports" },
            { code: "1.5", desc: "C-1.5: Creates content for audio, visual, or both" },
            { code: "2.1", desc: "C-2.1: Identifies and appreciates different forms of literature" },
            { code: "2.2", desc: "C-2.2: Identifies literary devices by reading literature" },
            { code: "2.3", desc: "C-2.3: Expresses ideas and critiques on social/cultural surroundings" },
            { code: "3.1", desc: "C-3.1: Interprets and understands basic linguistic rules" },
            { code: "3.2", desc: "C-3.2: Writes prose, poetry, and drama using appropriate language" },
            { code: "4.1", desc: "C-4.1: Reads, responds to, and critically reviews books" },
            { code: "4.2", desc: "C-4.2: Uses books and media resources effectively for projects" },
            { code: "5.1", desc: "C-5.1: Understands phonetics and script" },
            { code: "5.2", desc: "C-5.2: Engages in wordplays, puns, rhymes" },
            { code: "5.3", desc: "C-5.3: Becomes familiar with major word games" }
        ];

        const compCoverage = {};
        allCompetencies.forEach(c => {
            compCoverage[c.code] = { desc: c.desc, covered: false, chapters: [] };
        });

        const skillsCoverage = {};

        auditedChapters.forEach(ch => {
            const acts = data.chapters[ch] || [];
            acts.forEach(act => {
                const match = act.competencyCode ? act.competencyCode.match(/C-(\d+\.\d+)/) || act.competencyCode.match(/(\d+\.\d+)/) : null;
                if (match) {
                    const code = match[1];
                    if (compCoverage[code]) {
                        compCoverage[code].covered = true;
                        if (!compCoverage[code].chapters.includes(ch)) {
                            compCoverage[code].chapters.push(ch);
                        }
                    }
                }
                if (act.skillName) {
                    const skill = act.skillName.trim();
                    skillsCoverage[skill] = (skillsCoverage[skill] || 0) + 1;
                }
            });
        });

        const totalCompetenciesCovered = Object.values(compCoverage).filter(c => c.covered).length;

        if (auditedChapters.length > 0 && trackerWidget) {
            trackerWidget.style.display = 'flex';
            if (trackerChaptersCount) trackerChaptersCount.textContent = auditedChapters.length;
            if (trackerCompetencyCount) trackerCompetencyCount.textContent = `${totalCompetenciesCovered} / 15`;
            
            const pct = Math.round((totalCompetenciesCovered / 15) * 100);
            if (trackerProgressBar) trackerProgressBar.style.width = `${pct}%`;

            if (trackerMatrixGrid) {
                trackerMatrixGrid.innerHTML = '';
                Object.keys(compCoverage).forEach(code => {
                    const info = compCoverage[code];
                    const div = document.createElement('div');
                    div.className = `matrix-item ${info.covered ? 'covered' : ''}`;
                    div.textContent = `C-${code}`;
                    div.title = `${info.desc}\n${info.covered ? 'Covered in: ' + info.chapters.join(', ') : 'Not covered yet'}`;
                    trackerMatrixGrid.appendChild(div);
                });
            }

            if (trackerSkillsDistribution) {
                trackerSkillsDistribution.innerHTML = '';
                const skills = Object.keys(skillsCoverage);
                if (skills.length > 0) {
                    skills.forEach(skill => {
                        const badge = document.createElement('span');
                        badge.className = 'skill-badge';
                        badge.textContent = `${skill}: ${skillsCoverage[skill]}`;
                        trackerSkillsDistribution.appendChild(badge);
                    });
                } else {
                    trackerSkillsDistribution.innerHTML = '<div style="font-size:0.75rem;color:var(--text-secondary)">No skills mapped yet.</div>';
                }
            }
        } else if (trackerWidget) {
            trackerWidget.style.display = 'none';
        }
    } catch (e) {
        console.error('Error updating tracker UI:', e);
    }
}

if (resetTrackerBtn) {
    resetTrackerBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to reset the cumulative book tracker? This will clear all audit history.')) return;
        safeSetStorage('ncf_tracker', { chapters: {} });
        updateTrackerUI();
    });
}

if (toggleTrackerDetailsBtn && trackerDetailsPanel) {
    toggleTrackerDetailsBtn.addEventListener('click', () => {
        if (trackerDetailsPanel.style.display === 'none') {
            trackerDetailsPanel.style.display = 'flex';
            toggleTrackerDetailsBtn.textContent = '🔼 Hide Coverage Matrix';
        } else {
            trackerDetailsPanel.style.display = 'none';
            toggleTrackerDetailsBtn.textContent = '🔍 View Coverage Matrix';
        }
    });
}

// ─── RENDERING RESULTS ────────────────────────────────────────────────────────
function renderResults(activities, append = false) {
    if (!resultsContainer) return;
    if (resultsPlaceholder) resultsPlaceholder.style.display = 'none';
    resultsContainer.style.display = 'flex';
    if (!append) resultsContainer.innerHTML = '';

    activities.forEach(act => {
        const card = document.createElement('div');
        card.className = 'result-card';
        const statusClass = (act.auditStatus || 'Missing').toLowerCase().replace(/\s+/g, '-');

        card.innerHTML = `
          <div class="card-header">
            <span class="page-badge">📄 Page: ${esc(act.pageNumber || 'N/A')}</span>
            <span class="tag-badge">${esc(act.competencyCode)}</span>
          </div>

          <div class="card-act-name">
            <span class="act-label">Activity:</span>
            <span class="act-value">${esc(act.activityName)}</span>
          </div>

          <div class="card-body">
            
            <div style="margin-bottom: 8px;">
              <span class="act-label">Audit Status:</span>
              <span class="audit-badge ${statusClass}">${esc(act.auditStatus || 'Missing')}</span>
            </div>

            <div class="comparison-box">
              <div class="comparison-title">Audit Tag Comparison</div>
              <div class="comparison-row">
                <span class="comparison-label">Printed in Textbook:</span>
                <span class="comparison-val printed">CG: ${esc(act.printedCompetency || 'None')} | Skill: ${esc(act.printedSkill || 'None')}</span>
              </div>
              <div class="comparison-row">
                <span class="comparison-label">Correct Official Mapping:</span>
                <span class="comparison-val correct-val">${esc(act.competencyCode)} | Skill: ${esc(act.skillName)}</span>
              </div>
            </div>

            <div class="cg-line-box">
              <div class="cg-line-en">
                <span class="cg-code-label">${esc(act.competencyCode)} —</span>
                <span class="cg-text-en">${esc(act.coreCompetencyText)}</span>
              </div>
              <div class="cg-line-hi">
                <span class="hindi-label">हिंदी:</span>
                <span class="cg-text-hi">${esc(act.coreCompetencyHindi)}</span>
              </div>
            </div>

            <div class="explanation-box">
              <div class="exp-label">💡 Explanation (Hindi):</div>
              <div class="exp-text">${esc(act.explanation)}</div>
            </div>

          </div>`;

        resultsContainer.appendChild(card);
    });
}
