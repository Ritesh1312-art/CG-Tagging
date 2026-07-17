// NCF Tagging App — Frontend v6 (Interactive Chat-Driven Flow)

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

let state = {
    stages: [],
    selectedStage: '',
    selectedCorePath: '',    // e.g. "03. Middle/English M.CG.pdf"
    uploadedText: '',
    uploadedFilename: '',
    analysisReady: false,    // true after deep-analyze complete
    chatHistory: []
};

// ─── INIT ────────────────────────────────────────────────────────────────────
loadCoreFiles();
loadFixedFiles();
updateTrackerUI(); // Initialize tracker UI on load
setAnalyzeBtnLabel('🔍 Analyze All Files & Start Chat');

// Hook up tracker event listeners
resetTrackerBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset the cumulative book tracker? This will clear all audit history.')) return;
    try {
        const res = await fetch('/api/tracker/reset', { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        alert('Tracker reset successfully!');
        updateTrackerUI();
    } catch (e) {
        alert('Failed to reset tracker: ' + e.message);
    }
});

toggleTrackerDetailsBtn.addEventListener('click', () => {
    if (trackerDetailsPanel.style.display === 'none') {
        trackerDetailsPanel.style.display = 'flex';
        toggleTrackerDetailsBtn.textContent = '🔼 Hide Coverage Matrix';
    } else {
        trackerDetailsPanel.style.display = 'none';
        toggleTrackerDetailsBtn.textContent = '🔍 View Coverage Matrix';
    }
});

async function updateTrackerUI() {
    try {
        const res = await fetch('/api/tracker');
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.auditedChapters && data.auditedChapters.length > 0) {
            trackerWidget.style.display = 'flex';
            trackerChaptersCount.textContent = data.auditedChapters.length;
            trackerCompetencyCount.textContent = `${data.totalCompetenciesCovered} / 15`;
            
            const pct = Math.round((data.totalCompetenciesCovered / 15) * 100);
            trackerProgressBar.style.width = `${pct}%`;
            
            // Render coverage matrix
            trackerMatrixGrid.innerHTML = '';
            Object.keys(data.competencies).forEach(code => {
                const info = data.competencies[code];
                const div = document.createElement('div');
                div.className = `matrix-item ${info.covered ? 'covered' : ''}`;
                div.textContent = `C-${code}`;
                div.title = `${info.desc}\n${info.covered ? 'Covered in: ' + info.chapters.join(', ') : 'Not covered yet'}`;
                trackerMatrixGrid.appendChild(div);
            });
            
            // Render skills distribution
            trackerSkillsDistribution.innerHTML = '';
            const skills = Object.keys(data.skills);
            if (skills.length > 0) {
                skills.forEach(skill => {
                    const badge = document.createElement('span');
                    badge.className = 'skill-badge';
                    badge.textContent = `${skill}: ${data.skills[skill]}`;
                    trackerSkillsDistribution.appendChild(badge);
                });
            } else {
                trackerSkillsDistribution.innerHTML = '<div style="font-size:0.75rem;color:var(--text-secondary)">No skills mapped yet.</div>';
            }
        } else {
            trackerWidget.style.display = 'none';
        }
    } catch (e) {
        console.error('Error updating tracker UI:', e);
    }
}

// ─── STAGE + CG FILE ─────────────────────────────────────────────────────────
async function loadCoreFiles() {
    try {
        const res = await fetch('/api/list-core');
        const data = await res.json();
        if (data.stages && data.stages.length > 0) {
            state.stages = data.stages;
            populateStageSelect(data.stages);
        } else {
            stageSelect.innerHTML = '<option value="">-- No stages found in core_folders/ --</option>';
        }
    } catch (e) {
        stageSelect.innerHTML = '<option value="">-- Error loading stages --</option>';
    }
}

function populateStageSelect(stages) {
    stageSelect.innerHTML = '<option value="">-- Select Stage --</option>';
    stages.forEach(s => {
        const o = document.createElement('option');
        o.value = s.name; o.textContent = s.name;
        stageSelect.appendChild(o);
    });
}

stageSelect.addEventListener('change', () => {
    const name = stageSelect.value;
    state.selectedStage = name;
    state.selectedCorePath = '';
    checkReady();

    if (!name) { coreSelect.innerHTML = '<option value="">-- First select a Stage --</option>'; coreSelect.disabled = true; return; }
    const stage = state.stages.find(s => s.name === name);
    if (stage && stage.files && stage.files.length > 0) {
        coreSelect.innerHTML = '<option value="">-- Select Subject CG File --</option>';
        stage.files.forEach(f => {
            const o = document.createElement('option');
            o.value = f.relativePath; o.textContent = f.name;
            coreSelect.appendChild(o);
        });
        coreSelect.disabled = false;
    } else {
        coreSelect.innerHTML = '<option value="">-- No CG files in this stage --</option>';
        coreSelect.disabled = true;
    }
});

coreSelect.addEventListener('change', () => {
    state.selectedCorePath = coreSelect.value;
    checkReady();
});

refreshCoreBtn.addEventListener('click', loadCoreFiles);

// ─── FIXED FILE ───────────────────────────────────────────────────────────────
async function loadFixedFiles() {
    try {
        const res = await fetch('/api/list-fixed');
        const data = await res.json();
        fixedFileName.textContent = data.files && data.files.length > 0
            ? data.files.join(', ') + ' ✅'
            : 'No file found in fixed/ folder';
    } catch (e) { fixedFileName.textContent = 'Error detecting fixed file'; }
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
['dragleave', 'dragend'].forEach(t => dropZone.addEventListener(t, () => dropZone.classList.remove('dragover')));
dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); });

// Handle file upload – store text but do not display preview
async function handleFileUpload(file) {
    showLoading(true, '📄 File extract ho rahi hai...');
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-filename': file.name, 'Content-Type': 'application/octet-stream' },
            body: file
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        state.uploadedText     = data.text;
        state.uploadedFilename = data.filename;
        state.analysisReady    = false;

        document.querySelector('.file-name-text').textContent = file.name;
        uploadedFileStatus.style.display = 'flex';
        // Do NOT show text preview container
        // dropZone hidden, keep upload status visible
        dropZone.style.display = 'none';
        checkReady();
    } catch (e) {
        alert('Upload failed: ' + e.message);
    } finally {
        showLoading(false);
    }
}

removeFileBtn.addEventListener('click', () => {
    state.uploadedText = '';
    state.uploadedFilename = '';
    state.analysisReady = false;
    uploadedFileStatus.style.display = 'none';
    dropZone.style.display = 'block';
    textPreviewContainer.style.display = 'none';
    fileInput.value = '';
    resetChat();
    checkReady();
});

// ─── ANALYZE BUTTON → triggers deep analysis then chat takes over ─────────────
function checkReady() {
    analyzeBtn.disabled = !(state.selectedCorePath && state.uploadedText);
}

function setAnalyzeBtnLabel(text) { analyzeBtn.textContent = text; }
function showLoading(show, msg) {
    if (msg && loadingMsg) loadingMsg.textContent = msg;
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

analyzeBtn.addEventListener('click', async () => {
    if (state.analysisReady) return;
    showLoading(true, '🧠 Teeno files ko deeply analyze kar raha hoon...');
    try {
        const res = await fetch('/api/deep-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                coreFileRelativePath: state.selectedCorePath,
                uploadedText: state.uploadedText,
                uploadedFilename: state.uploadedFilename
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Show simple status in working space
        resultsPlaceholder.textContent = data.status || 'Analyse completed';
        resultsPlaceholder.style.display = 'block';
        resultsContainer.style.display = 'none';
        state.analysisReady = true;
        // Reset chat history
        state.chatHistory = [];
        enableChat();
        addChatBubble('ai', '✅ Analyse ho gaya. Aap kahan tagging karwana chahte hain? (e.g. "Activity 2 aur 5 ka tag karo")');

        // Update UI
        analyzeBtn.textContent = '✅ Analysis Done';
        analyzeBtn.disabled = true;
        resultsPlaceholder.textContent = '💬 Chat mein batayein: "Activity 2 aur 5 ka tagging karo" — results yahan dikhenge.';

    } catch (e) {
        alert('Analysis failed: ' + e.message);
    } finally {
        showLoading(false);
    }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function enableChat() {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.placeholder = 'Batao kahan tagging chahiye... (e.g. "Activity 1, 3 aur 5 ka tag karo")';
    chatInput.focus();
}

function resetChat() {
    state.chatHistory = [];
    state.analysisReady = false;
    chatMessages.innerHTML = `
      <div class="chat-bubble-container ai-container">
        <div class="chat-bubble-label">NCF Auditor 🤖</div>
        <div class="chat-bubble ai-bubble">
          Namaskar! 👋 CG File select karein, aur Chapter PDF upload karein.
          Phir "Analyze" button dabayein — main teeno files ko deeply analyze karke aapko activity list deta hoon.
        </div>
      </div>`;
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    chatInput.placeholder = 'Pehle file analyze karein...';
    analyzeBtn.textContent = '🔍 Analyze All Files & Start Chat';
    analyzeBtn.disabled = true;
    resultsPlaceholder.style.display = 'block';
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
}

chatSendBtn.addEventListener('click', sendChatMsg);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatMsg(); });

async function sendChatMsg() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatBubble('user', text);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    state.chatHistory.push({ role: 'user', content: text });

    const thinkingBubble = addChatBubble('ai', '⏳ Soch raha hoon...');

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: state.chatHistory,
                message: text,
                context: {
                    coreFileRelativePath: state.selectedCorePath,
                    uploadedText: state.uploadedText,
                    uploadedFilename: state.uploadedFilename
                }
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        thinkingBubble.remove();
        addChatBubble('ai', data.reply);
        state.chatHistory.push({ role: 'assistant', content: data.reply });

        // If tagging data returned → render result cards and update tracker UI
        if (data.taggingData && data.taggingData.activities && data.taggingData.activities.length > 0) {
            renderResults(data.taggingData.activities, true); // append mode
            updateTrackerUI();
        }

    } catch (e) {
        thinkingBubble.textContent = '❌ Error: ' + e.message;
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

// ─── RESULTS RENDERING ────────────────────────────────────────────────────────
function renderResults(activities, append = false) {
    resultsPlaceholder.style.display = 'none';
    resultsContainer.style.display = 'flex';
    if (!append) resultsContainer.innerHTML = '';

    activities.forEach(act => {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const statusClass = (act.auditStatus || 'Missing').toLowerCase().replace(' ', '-');

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
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}


function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function addChatBubble(sender, text) {
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${sender}-container`;
    
    const label = document.createElement('div');
    label.className = 'chat-bubble-label';
    label.textContent = sender === 'user' ? 'Aap (You)' : 'NCF Auditor 🤖';
    
    const b = document.createElement('div');
    b.className = `chat-bubble ${sender}-bubble`;
    b.textContent = text;
    
    container.appendChild(label);
    container.appendChild(b);
    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return container;
}

// Initial chat message
resetChat();
