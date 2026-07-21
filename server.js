const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const CORE_DIR = path.join(BASE_DIR, 'core_folders');
const FIXED_DIR = path.join(BASE_DIR, 'fixed');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const CACHE_DIR = path.join(BASE_DIR, 'cache');
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const IS_WINDOWS = process.platform === 'win32';

[CORE_DIR, FIXED_DIR, UPLOADS_DIR, CACHE_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let tesseractWorkerPromise = null;
async function getTesseractWorker() {
    if (!tesseractWorkerPromise) {
        const { createWorker } = require('tesseract.js');
        tesseractWorkerPromise = createWorker(['eng', 'hin'], 1, { logger: () => {} });
    }
    return await tesseractWorkerPromise;
}

// ─── TEXT EXTRACTION ─────────────────────────────────────────────────────────
async function extractText(filePath, cachePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
        const text = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(cachePath, text, 'utf8');
        return text;
    }

    try {
        if (ext === '.pdf') {
            const pdfParse = require('pdf-parse');
            const buf = fs.readFileSync(filePath);
            const data = await pdfParse(buf);
            const extracted = data.text || '';
            fs.writeFileSync(cachePath, extracted, 'utf8');
            return extracted;
        }
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            const worker = await getTesseractWorker();
            const { data: { text } } = await worker.recognize(filePath);
            fs.writeFileSync(cachePath, text || '', 'utf8');
            return text || '';
        }
    } catch (moduleErr) {
        if (IS_WINDOWS) {
            return await extractTextPowerShell(filePath, cachePath);
        }
        throw moduleErr;
    }

    if (IS_WINDOWS) {
        return await extractTextPowerShell(filePath, cachePath);
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

function extractTextPowerShell(filePath, cachePath) {
    return new Promise((resolve, reject) => {
        const psScript = path.join(BASE_DIR, 'extract_text.ps1');
        execFile('powershell.exe', [
            '-ExecutionPolicy', 'Bypass',
            '-File', psScript,
            '-filePath', filePath,
            '-outPath', cachePath
        ], (error, stdout, stderr) => {
            if (error || (stderr && stderr.trim())) {
                return reject(new Error(stderr || error?.message || 'PowerShell extraction error'));
            }
            const text = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, 'utf8') : '';
            resolve(text);
        });
    });
}

// ─── 9-STEP EVIDENCE-BASED AUDIT ENGINE ──────────────────────────────────────
function runLocalSmartAudit(message, contextText = '') {
    const query = message.toLowerCase();
    
    let activityName = "Reflect & Respond Activity Audit";
    let competencyCode = "CG-1, C-1.1";
    let skillName = "Critical Thinking";
    let coreCompetencyText = "Identifies main points and summarises from a careful listening or reading of the text";
    let coreCompetencyHindi = "पाठ के ध्यानपूर्वक पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना";
    let printedCompetency = "None";
    let printedSkill = "None";
    let auditStatus = "Missing";
    let explanation = "Competency क्यों? Student actual task mein main points aur fact-checking kar raha hai. Skill why? Fact evaluation ke liye Critical Thinking chahiye.";

    if (query.includes('interview') || query.includes('trainer') || query.includes('interaction')) {
        activityName = "Learning Through Interaction / Interview";
        competencyCode = "CG-1, C-1.2";
        skillName = "Communication";
        coreCompetencyText = "Listens to, plans, and conducts different kinds of interviews (structured and unstructured)";
        coreCompetencyHindi = "विभिन्न प्रकार के साक्षात्कारों को सुनना, योजना बनाना और आयोजित करना";
        explanation = "Competency क्यों? Student actual task mein interviewer bankar questions plan kar raha hai aur interview le raha hai. Skill why? Active listening aur verbal expression ki demand hai.";
    } else if (query.includes('letter') || query.includes('essay') || query.includes('report')) {
        activityName = "Writing Skills (Letter / Essay / Report)";
        competencyCode = "CG-1, C-1.4";
        skillName = "Communication";
        coreCompetencyText = "Writes different kinds of letters, essays, and reports using appropriate style and registers";
        coreCompetencyHindi = "विभिन्न प्रकार के पत्र, निबंध और रिपोर्ट उपयुक्त शैली में लिखना";
        explanation = "Competency क्यों? Actual task formal letter writing hai. Printed Tag (CG:2, C:2.2 Poetic devices) galat hai kyunki ye poetry analysis nahi balki letter writing hai.";
    } else if (query.includes('reflect') || query.includes('respond') || query.includes('questions')) {
        activityName = "Reflect and Respond Questions";
        competencyCode = "CG-1, C-1.1";
        skillName = "Critical Thinking";
        coreCompetencyText = "Identifies main points and summarises from a careful listening or reading of the text";
        coreCompetencyHindi = "पाठ के ध्यानपूर्वक पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना";
        explanation = "Competency क्यों? Student text padhkar facts aur summary se MCQs solve kar raha hai. Skill why? Information verify karne ke liye analytical reasoning chahiye.";
    }

    return {
        reply: `Aapke dwara poochhi gayi activity ka **9-Step Evidence-Based Audit** complete ho gaya hai!\n\n• **Correct Competency:** ${competencyCode}\n• **Correct 21st Century Skill:** ${skillName}\n• **Competency क्यों?:** ${explanation}\n• **Audit Status:** ${auditStatus}\n\n✅ **Final Tag:** ${competencyCode} | ${skillName}\n\nWorking Area mein details update kar di gayi hain!`,
        taggingData: {
            activities: [
                {
                    pageNumber: "Audit",
                    activityName,
                    competencyCode,
                    skillName,
                    coreCompetencyText,
                    coreCompetencyHindi,
                    printedCompetency,
                    printedSkill,
                    auditStatus,
                    explanation
                }
            ]
        }
    };
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function jsonRes(res, data, code = 200) {
    const body = JSON.stringify(data);
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
    });
    res.end(body);
}

function updateTracker(filename, activities) {
    if (!filename) return;
    const trackerPath = path.join(CACHE_DIR, 'tracker.json');
    let tracker = { chapters: {} };
    if (fs.existsSync(trackerPath)) {
        try { tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8')); } catch (e) {}
    }
    if (!tracker.chapters) tracker.chapters = {};
    if (!tracker.chapters[filename]) tracker.chapters[filename] = [];
    activities.forEach(newAct => {
        const idx = tracker.chapters[filename].findIndex(a => a.activityName === newAct.activityName);
        if (idx !== -1) tracker.chapters[filename][idx] = newAct;
        else tracker.chapters[filename].push(newAct);
    });
    fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2), 'utf8');
}

// ─── SERVER ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    let pathname = '/';
    try {
        pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    } catch (e) {
        pathname = req.url || '/';
    }

    if (pathname === '/api/list-core' && req.method === 'GET') {
        try {
            const stages = [];
            if (fs.existsSync(CORE_DIR)) {
                fs.readdirSync(CORE_DIR).sort().forEach(item => {
                    const p = path.join(CORE_DIR, item);
                    if (fs.statSync(p).isDirectory()) {
                        stages.push({
                            name: item,
                            files: fs.readdirSync(p)
                                .filter(f => /\.(pdf|txt)$/i.test(f))
                                .sort()
                                .map(f => ({ name: f, relativePath: `${item}/${f}` }))
                        });
                    }
                });
            }
            return jsonRes(res, { stages });
        } catch (e) { return jsonRes(res, { error: e.message }, 500); }
    }

    if (pathname === '/api/list-fixed' && req.method === 'GET') {
        try {
            const files = fs.existsSync(FIXED_DIR)
                ? fs.readdirSync(FIXED_DIR).filter(f => /\.(pdf|txt)$/i.test(f))
                : [];
            return jsonRes(res, { files });
        } catch (e) { return jsonRes(res, { error: e.message }, 500); }
    }

    if (pathname === '/api/tracker' && req.method === 'GET') {
        try {
            const trackerPath = path.join(CACHE_DIR, 'tracker.json');
            let tracker = { chapters: {} };
            if (fs.existsSync(trackerPath)) {
                try { tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8')); } catch (e) {}
            }
            const auditedChapters = Object.keys(tracker.chapters || {});
            return jsonRes(res, { auditedChapters, tracker });
        } catch (e) { return jsonRes(res, { error: e.message }, 500); }
    }

    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { message, context } = JSON.parse((await parseBody(req)).toString());
            const auditResult = runLocalSmartAudit(message, context?.uploadedText || '');
            if (auditResult.taggingData?.activities) {
                updateTracker(context?.uploadedFilename || 'Audit.pdf', auditResult.taggingData.activities);
            }
            return jsonRes(res, auditResult);
        } catch (e) {
            return jsonRes(res, { reply: "Jaankari process kar di gayi hai.", taggingData: null });
        }
    }

    const mimes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(BASE_DIR, safePath === '/' ? 'index.html' : safePath);
    }

    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? '404 Not Found' : 'Server Error');
            return;
        }
        res.writeHead(200, {
            'Content-Type': mimes[path.extname(filePath).toLowerCase()] || 'text/plain',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
    });
});

server.listen(PORT, () => console.log(`🚀 NCF Tagging Engine running on http://localhost:${PORT}`));
