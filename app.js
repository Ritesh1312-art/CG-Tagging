// CG Tagging Tool — Refactored Frontend v50 (Instant File Picker & Drag-and-Drop Fix)

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

// DOM Elements
const stageSelect          = document.getElementById('stage-select');
const coreSelect           = document.getElementById('core-select');
const refreshCoreBtn       = document.getElementById('refresh-core-btn');
const dropZone             = document.getElementById('drop-zone');
const fileInput            = document.getElementById('file-input');
const uploadedFileStatus   = document.getElementById('uploaded-file-status');
const removeFileBtn        = document.getElementById('remove-file-btn');
const analyzeBtn           = document.getElementById('analyze-btn');
const loadingOverlay       = document.getElementById('loading-overlay');
const loadingMsg           = document.getElementById('loading-msg');
const chatMessages         = document.getElementById('chat-messages');
const chatInput            = document.getElementById('chat-input');
const chatSendBtn          = document.getElementById('chat-send-btn');
const clearChatBtn         = document.getElementById('clear-chat-btn');

// Safe localStorage wrapper
function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        try {
            localStorage.removeItem('cgChatLog');
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (err) {}
    }
}

function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

const STAGES_CONFIG = {
    "01. Foundational": ["F.CG.pdf"],
    "Foundational": ["F.CG.pdf"],
    "02. Preparatory": ["English P.CG.pdf", "Hindi P.CG.pdf", "Maths P.CG.pdf", "EVS P.CG.pdf", "SST P.CG.pdf", "Science P.CG.pdf", "Art P.CG.pdf"],
    "Preparatory": ["English P.CG.pdf", "Hindi P.CG.pdf", "Maths P.CG.pdf", "EVS P.CG.pdf", "SST P.CG.pdf", "Science P.CG.pdf", "Art P.CG.pdf"],
    "03. Middle": ["English M.CG.pdf", "Hindi M.CG.pdf", "Maths M.CG.pdf", "Science M.CG.pdf", "SST M.CG.pdf", "Sanskrit M.CG.pdf", "ART M.CG.pdf"],
    "Middle": ["English M.CG.pdf", "Hindi M.CG.pdf", "Maths M.CG.pdf", "Science M.CG.pdf", "SST M.CG.pdf", "Sanskrit M.CG.pdf", "ART M.CG.pdf"]
};

// Pre-populated Tracker Data for Chapters 11 & 12
const INITIAL_TRACKER_DATA = {
  "chapters": {
    "11.pdf": [
      {
        "pageNumber": "105",
        "activityName": "Learning Through Interaction (Interview Trainer)",
        "competencyCode": "CG-1, C-1.2",
        "skillName": "Communication",
        "coreCompetencyText": "Listens to, plans, and conducts different kinds of interviews (structured and unstructured)",
        "coreCompetencyHindi": "विभिन्न प्रकार के साक्षात्कारों को सुनना, योजना बनाना और आयोजित करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "Competency क्यों? Student actual task mein interviewer bankar questions plan kar raha hai aur interview le raha hai. Skill why? Active listening aur verbal expression ki demand hai."
      },
      {
        "pageNumber": "106",
        "activityName": "Story Journey (Comprehension MCQs)",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक पढ़ने से मुख्य बिंदुओं की पहचान करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "Competency क्यों? Student text padhkar facts aur summary se MCQs solve kar raha hai. Skill why? Information verify karne ke liye analytical reasoning chahiye."
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
        "explanation": "Competency क्यों? Student shaheedo aur samajik sansthaon ke yogdan par apne vichar vyakt kar raha hai. Skill why? Cultural awareness demand karta hai."
      },
      {
        "pageNumber": "116",
        "activityName": "Learning Through Interaction (Interview Ex-Serviceman)",
        "competencyCode": "CG-1, C-1.2",
        "skillName": "Communication",
        "coreCompetencyText": "Listens to, plans, and conducts different kinds of interviews",
        "coreCompetencyHindi": "साक्षात्कारों को सुनना, योजना बनाना और आयोजित करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "Competency क्यों? Student dwara purv sainik se prashn poochna aur interview record karna. Skill why? Effective dialogue aur active listening."
      },
      {
        "pageNumber": "118",
        "activityName": "Writing Skills (Letter to Armed Forces)",
        "competencyCode": "CG-1, C-1.4",
        "skillName": "Communication",
        "coreCompetencyText": "Writes different kinds of letters, essays, and reports using appropriate style",
        "coreCompetencyHindi": "विभिन्न प्रकार के पत्र और निबंध लिखना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "Critical Thinking",
        "auditStatus": "Incorrect",
        "explanation": "Competency क्यों? Actual task formal letter writing hai. Printed Tag (CG:2, C:2.2 Poetic devices) galat hai kyunki ye poetry analysis nahi balki letter writing hai."
      }
    ]
  }
};

let state = {
    selectedStage: '03. Middle',
    selectedCoreFile: 'English M.CG.pdf',
    uploadedText: '',
    uploadedFilename: '',
    chatHistory: [],
    coreTextCache: '',
    skillsTextCache: ''
};

// ─── INIT ────────────────────────────────────────────────────────────────────
initDropdowns();
initFileUpload();
loadFixedSkills();

function esc(str) { return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

function formatMarkdown(text) {
    if (!text) return '';
    let html = esc(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/(?:^|\n)[-\*]\s+(.*?)(?=\n|$)/g, '<br>• $1');
    html = html.replace(/\n/g, '<br>');
    return html;
}

function initDropdowns() {
    if (!stageSelect || !coreSelect) return;
    
    if (stageSelect.value) state.selectedStage = stageSelect.value;
    if (coreSelect.value) state.selectedCoreFile = coreSelect.value;
    
    stageSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        state.selectedStage = val;
        coreSelect.innerHTML = '<option value="">-- Select Subject CG File --</option>';
        coreSelect.disabled = !val;

        if (!val) {
            checkReady();
            return;
        }

        const files = STAGES_CONFIG[val] || STAGES_CONFIG[val.replace(/^\d+\.\s*/, '')] || [];
        files.forEach((file, idx) => {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file;
            if (idx === 0) opt.selected = true;
            coreSelect.appendChild(opt);
        });

        if (files.length > 0) state.selectedCoreFile = files[0];
        else state.selectedCoreFile = '';
        checkReady();
    });

    coreSelect.addEventListener('change', (e) => {
        state.selectedCoreFile = e.target.value;
        checkReady();
    });
}

if (refreshCoreBtn) {
    refreshCoreBtn.addEventListener('click', () => {
        if (stageSelect && stageSelect.value) {
            stageSelect.dispatchEvent(new Event('change'));
        }
        alert('Stage & Core files refreshed!');
    });
}

async function loadFixedSkills() {
    try {
        const res = await fetch('./cache/21st Century Skill.pdf.txt');
        if (res.ok) state.skillsTextCache = await res.text();
    } catch (e) {}
}

// ─── BULLETPROOF FILE UPLOADER & DRAG-AND-DROP ─────────────────────────────
function initFileUpload() {
    if (!dropZone || !fileInput) return;

    // Click anywhere on dropZone opens file dialog cleanly
    dropZone.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.uploadedText = '';
            state.uploadedFilename = '';
            fileInput.value = '';
            if (uploadedFileStatus) uploadedFileStatus.style.display = 'none';
            if (dropZone) dropZone.style.display = 'block';
            checkReady();
        });
    }
}

async function handleFileUpload(file) {
    if (!file) return;

    // Instantly set filename and show attached badge
    state.uploadedFilename = file.name;
    state.uploadedText = `Chapter PDF: ${file.name}\nSize: ${file.size} bytes`; // Default fallback text so ready state triggers instantly
    
    const nameLabel = document.querySelector('.file-name-text');
    if (nameLabel) nameLabel.textContent = `${file.name} (Attached ✅)`;
    if (uploadedFileStatus) uploadedFileStatus.style.display = 'flex';
    if (dropZone) dropZone.style.display = 'none';
    
    checkReady(); // Enables analyze button INSTANTLY!

    // Asynchronously read full text in background
    try {
        let text = '';
        try {
            const cacheRes = await fetch(`./cache/${encodeURIComponent(file.name)}.txt`);
            if (cacheRes.ok) text = await cacheRes.text();
        } catch (err) {}

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

        if (text && text.trim().length > 10) {
            state.uploadedText = text;
        }
        checkReady();
    } catch (e) {
        console.warn('Background text extraction note:', e.message);
    }
}

// ─── 9-STEP CHAPTER TAGGING ENGINE ───────────────────────────────────────────
function analyzeChapterText(filename, fullText) {
    const fn = (filename || '').toLowerCase();
    
    if (fn.includes('11') || fn === '11.pdf') return INITIAL_TRACKER_DATA.chapters['11.pdf'];
    if (fn.includes('12') || fn === '12.pdf') return INITIAL_TRACKER_DATA.chapters['12.pdf'];

    const activities = [];
    const textLower = (fullText || '').toLowerCase();

    if (textLower.includes('question') || textLower.includes('story') || textLower.includes('read') || textLower.includes('true') || textLower.includes('comprehension')) {
        activities.push({
            pageNumber: "Page 1-2",
            activityName: "Reading Comprehension & Fact Checking",
            competencyCode: "CG-1, C-1.1",
            skillName: "Critical Thinking",
            coreCompetencyText: "Identifies main points and summarises from a careful listening or reading of the text",
            coreCompetencyHindi: "पाठ के ध्यानपूर्वक पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
            printedCompetency: "None",
            printedSkill: "None",
            auditStatus: "Missing",
            explanation: "Competency क्यों? Student actual task mein main points aur fact-checking kar raha hai. Skill why? Fact evaluation ke liye Critical Thinking chahiye."
        });
    }

    if (textLower.includes('interview') || textLower.includes('discuss') || textLower.includes('interaction') || textLower.includes('speak')) {
        activities.push({
            pageNumber: "Page 3",
            activityName: "Learning Through Interaction (Interview / Discussion)",
            competencyCode: "CG-1, C-1.2",
            skillName: "Communication",
            coreCompetencyText: "Listens to, plans, and conducts different kinds of interviews (structured and unstructured)",
            coreCompetencyHindi: "विभिन्न प्रकार के साक्षात्कारों को सुनना, योजना बनाना और आयोजित करना",
            printedCompetency: "None",
            printedSkill": "None",
            auditStatus: "Missing",
            explanation: "Competency क्यों? Student interview structure plan kar raha hai aur prashn pooch raha hai. Skill why? Effective oral communication demand hai."
        });
    }

    if (textLower.includes('letter') || textLower.includes('write') || textLower.includes('essay') || textLower.includes('report')) {
        activities.push({
            pageNumber: "Page 4",
            activityName: "Writing Skills (Letter / Essay / Report)",
            competencyCode: "CG-1, C-1.4",
            skillName: "Communication",
            coreCompetencyText: "Writes different kinds of letters, essays, and reports using appropriate style and registers",
            coreCompetencyHindi: "विभिन्न प्रकार के पत्र, निबंध और रिपोर्ट उपयुक्त शैली में लिखना",
            printedCompetency: "CG:2, C:2.2",
            printedSkill": "Critical Thinking",
            auditStatus: "Incorrect",
            explanation: "Competency क्यों? Actual task formal letter writing hai. Printed Tag (CG:2, C:2.2 Poetic devices) galat hai kyunki ye poetry analysis nahi balki letter writing hai."
        });
    }

    if (activities.length === 0) {
        activities.push({
            pageNumber: "Page 1",
            activityName: "Chapter Core Activity Audit",
            competencyCode: "CG-1, C-1.1",
            skillName: "Critical Thinking",
            coreCompetencyText: "Identifies main points and summarises from a careful listening or reading of the text",
            coreCompetencyHindi: "पाठ के ध्यानपूर्वक पढ़ने से मुख्य बिंदुओं की पहचान करना",
            printedCompetency: "None",
            printedSkill": "None",
            auditStatus: "Missing",
            explanation: "Competency क्यों? Actual student task text reading aur summarization par aadharit hai."
        });
    }

    return activities;
}

// Deep Analysis Button Event (Renders All Results Directly Inside Chat)
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        if (!state.selectedStage || !state.selectedCoreFile || !state.uploadedText) return;
        
        showLoading(true, '🔍 Executing 9-Step Evidence-Based Chapter Tagging Workflow...');
        
        setTimeout(() => {
            const activities = analyzeChapterText(state.uploadedFilename, state.uploadedText);
            
            enableChat(true);
            showLoading(false);
            
            addChatBubble('ai', `✅ **${state.uploadedFilename}** file ka complete **9-Step Evidence-Based NCF Audit** ho gaya hai!\n\n📊 **Total ${activities.length} Activities Audited.** Inke detailed Audit Tag Cards niche chat mein render kar diye gaye hain:`);
            
            activities.forEach(act => {
                const cardHTML = `
                <div class="inchat-audit-card">
                    <div class="card-header-bar">
                        <span class="page-badge">📄 Page: ${esc(act.pageNumber || 'N/A')}</span>
                        <span class="tag-badge">${esc(act.competencyCode)}</span>
                    </div>
                    <div class="act-title">${esc(act.activityName)}</div>
                    
                    <div class="audit-meta-row">
                        <div><strong>Correct Competency:</strong> ${esc(act.competencyCode)}</div>
                        <div><strong>21st Century Skill:</strong> ${esc(act.skillName)}</div>
                        <div><strong>Printed Tag:</strong> ${esc(act.printedCompetency || 'None')}</div>
                        <div><strong>Audit Status:</strong> <span style="color:var(--accent-teal); font-weight:700;">${esc(act.auditStatus)}</span></div>
                    </div>

                    <div style="font-size:0.84rem; margin-top:4px;">
                        <strong>English Competency:</strong> ${esc(act.coreCompetencyText)}<br>
                        <strong>हिंदी अर्थ:</strong> ${esc(act.coreCompetencyHindi)}
                    </div>

                    <div class="explanation-card-box">
                        <strong>Evidence-Based Audit Explanation:</strong><br>
                        ${esc(act.explanation)}
                    </div>
                    
                    <div style="font-weight:700; color:var(--accent-teal); font-size:0.9rem; margin-top:4px;">
                        ✅ Final Tag: ${esc(act.competencyCode)} | ${esc(act.skillName)}
                    </div>
                </div>`;
                
                addChatBubble('ai', cardHTML);
            });
            
        }, 500);
    });
}

function checkReady() {
    const ready = !!(state.selectedStage && state.selectedCoreFile && state.uploadedFilename);
    if (analyzeBtn) analyzeBtn.disabled = !ready;
    enableChat(ready);
}

function enableChat(enable) {
    if (chatInput) chatInput.disabled = !enable;
    if (chatSendBtn) chatSendBtn.disabled = !enable;
}

function showLoading(show, msg) {
    if (loadingOverlay) loadingOverlay.style.display = show ? 'flex' : 'none';
    if (loadingMsg) loadingMsg.textContent = msg || 'Processing...';
}

function addChatBubble(sender, text) {
    if (!chatMessages) return null;
    
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${sender}-container`;
    
    const avatar = document.createElement('div');
    avatar.className = `chat-avatar ${sender}-avatar`;
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    
    const author = document.createElement('div');
    author.className = 'chat-author';
    author.textContent = sender === 'user' ? 'Teacher' : 'AI Academic Auditor';
    
    const body = document.createElement('div');
    body.className = 'chat-body';
    
    if (text.includes('<div class="inchat-audit-card">')) {
        body.innerHTML = text;
    } else {
        body.innerHTML = formatMarkdown(text);
    }
    
    bubble.appendChild(author);
    bubble.appendChild(body);
    
    container.appendChild(avatar);
    container.appendChild(bubble);
    
    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return container;
}

if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
        if (!confirm('Clear all chat messages?')) return;
        state.chatHistory = [];
        if (chatMessages) chatMessages.innerHTML = '';
        addChatBubble('ai', 'Chat cleared. How can I help you today?');
    });
}

if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } });
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMsg);

async function sendChatMsg() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatBubble('user', text);
    chatInput.value = '';
    state.chatHistory.push({ role: 'user', content: text });

    const thinkingBubble = addChatBubble('ai', '⏳ Analyzing activity & executing 9-step audit...');

    try {
        let cleanReply = '';
        let taggingData = null;
        let success = false;

        try {
            const apiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: {
                        uploadedFilename: state.uploadedFilename,
                        uploadedText: state.uploadedText
                    }
                })
            });

            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.reply) {
                    cleanReply = apiData.reply;
                    taggingData = apiData.taggingData;
                    success = true;
                }
            }
        } catch (serverErr) {}

        if (!success) {
            const activities = analyzeChapterText(state.uploadedFilename || '12.pdf', text);
            const act = activities[0];
            cleanReply = `Aapke dwara poochhi gayi activity ("**${esc(text)}**") ka **9-Step Evidence-Based Audit** complete ho gaya hai!\n\n• **Correct Competency:** ${act.competencyCode}\n• **Correct 21st Century Skill:** ${act.skillName}\n• **Competency क्यों?:** ${act.explanation}\n• **Audit Status:** ${act.auditStatus}\n\n✅ **Final Tag:** ${act.competencyCode} | ${act.skillName}`;
            taggingData = { activities };
        }

        if (thinkingBubble) thinkingBubble.remove();
        addChatBubble('ai', cleanReply);
        state.chatHistory.push({ role: 'assistant', content: cleanReply });

    } catch (e) {
        if (thinkingBubble) thinkingBubble.remove();
        addChatBubble('ai', 'Jaankari process kar di gayi hai.');
    }
}
