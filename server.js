const http = require('http');
const https = require('https');
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

// Cache Tesseract worker to avoid downloading traineddata on every request
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
        console.warn(`JS extraction failed: ${moduleErr.message}. Checking fallbacks...`);
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

// ─── AI CALL via Pollinations ────────────────────────────────────────────────
function queryAI(messages, jsonMode = false) {
    const payload = JSON.stringify({ messages, model: 'openai', jsonMode });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'text.pollinations.ai',
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        });

        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('AI timed out after 2 min')); });
        req.write(payload);
        req.end();
    });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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
        try {
            tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
        } catch (e) {
            console.error('Error parsing tracker.json:', e.message);
        }
    }
    if (!tracker.chapters) tracker.chapters = {};
    
    if (!tracker.chapters[filename]) {
        tracker.chapters[filename] = [];
    }
    activities.forEach(newAct => {
        const idx = tracker.chapters[filename].findIndex(a => a.activityName === newAct.activityName);
        if (idx !== -1) {
            tracker.chapters[filename][idx] = newAct;
        } else {
            tracker.chapters[filename].push(newAct);
        }
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

    // GET /api/list-core — stage → files structure
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

    // GET /api/list-fixed — fixed 21st century skills files
    if (pathname === '/api/list-fixed' && req.method === 'GET') {
        try {
            const files = fs.existsSync(FIXED_DIR)
                ? fs.readdirSync(FIXED_DIR).filter(f => /\.(pdf|txt)$/i.test(f))
                : [];
            return jsonRes(res, { files });
        } catch (e) { return jsonRes(res, { error: e.message }, 500); }
    }

    // GET /api/tracker — retrieve cumulative tracker state
    if (pathname === '/api/tracker' && req.method === 'GET') {
        try {
            const trackerPath = path.join(CACHE_DIR, 'tracker.json');
            let tracker = { chapters: {} };
            if (fs.existsSync(trackerPath)) {
                try {
                    tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
                } catch (e) {}
            }
            const auditedChapters = Object.keys(tracker.chapters || {});
            
            const allCompetencies = [
                { code: "1.1", desc: "C-1.1: Identifies main points and summarises text" },
                { code: "1.2", desc: "C-1.2: Listens to, plans, and conducts interviews" },
                { code: "1.3", desc: "C-1.3: Raises probing questions about social experiences" },
                { code: "1.4", desc: "C-1.4: Writes letters, essays, and reports" },
                { code: "1.5", desc: "C-1.5: Creates content for audio/visual media" },
                { code: "2.1", desc: "C-2.1: Identifies and appreciates literature" },
                { code: "2.2", desc: "C-2.2: Identifies literary devices" },
                { code: "2.3", desc: "C-2.3: Expresses ideas and critiques on surroundings" },
                { code: "3.1", desc: "C-3.1: Interprets linguistic rules" },
                { code: "3.2", desc: "C-3.2: Writes prose, poetry, and drama" },
                { code: "4.1", desc: "C-4.1: Reads and critically reviews books" },
                { code: "4.2", desc: "C-4.2: Uses media resources for projects" },
                { code: "5.1", desc: "C-5.1: Understands phonetics and script" },
                { code: "5.2", desc: "C-5.2: Engages in wordplays and puns" },
                { code: "5.3", desc: "C-5.3: Familiar with major word games" }
            ];
            
            const compCoverage = {};
            allCompetencies.forEach(c => {
                compCoverage[c.code] = { desc: c.desc, covered: false, chapters: [] };
            });
            
            const skillsCoverage = {};
            
            auditedChapters.forEach(ch => {
                const acts = tracker.chapters[ch] || [];
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
            
            return jsonRes(res, {
                auditedChapters,
                totalCompetenciesCovered,
                competencies: compCoverage,
                skills: skillsCoverage
            });
        } catch (e) {
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // POST /api/tracker/reset — reset cumulative tracker
    if (pathname === '/api/tracker/reset' && req.method === 'POST') {
        try {
            const trackerPath = path.join(CACHE_DIR, 'tracker.json');
            fs.writeFileSync(trackerPath, JSON.stringify({ chapters: {} }, null, 2), 'utf8');
            return jsonRes(res, { status: 'success' });
        } catch (e) {
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // POST /api/upload — save file + extract text
    if (pathname === '/api/upload' && req.method === 'POST') {
        const filename = req.headers['x-filename'];
        if (!filename) return jsonRes(res, { error: 'x-filename header missing' }, 400);
        const safeFilename = path.basename(filename);
        const destPath = path.join(UPLOADS_DIR, safeFilename);
        const cachePath = path.join(CACHE_DIR, safeFilename + '.txt');
        try {
            const buf = await parseBody(req);
            fs.writeFileSync(destPath, buf);
            console.log(`Saved upload: ${safeFilename}, extracting text...`);
            const text = await extractText(destPath, cachePath);
            return jsonRes(res, { text, filename: safeFilename });
        } catch (e) {
            console.error('Upload error:', e.message);
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // POST /api/deep-analyze — load files, extract text
    if (pathname === '/api/deep-analyze' && req.method === 'POST') {
        try {
            const { coreFileRelativePath, uploadedText } = JSON.parse((await parseBody(req)).toString());

            let coreText = '';
            if (coreFileRelativePath) {
                const coreAbs = path.join(CORE_DIR, coreFileRelativePath);
                const coreCache = path.join(CACHE_DIR, path.basename(coreAbs) + '.txt');
                if (!fs.existsSync(coreCache)) {
                    console.log(`Extracting CG: ${path.basename(coreAbs)}`);
                    await extractText(coreAbs, coreCache);
                }
                coreText = fs.existsSync(coreCache) ? fs.readFileSync(coreCache, 'utf8') : '';
            }

            const activitiesArray = [];
            return jsonRes(res, { status: 'Analyse done', activities: activitiesArray });

        } catch (e) {
            console.error('Deep analyze error:', e.message);
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // POST /api/chat — dual mode interactive chat + tagging
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { history, message, context } = JSON.parse((await parseBody(req)).toString());

            let coreText = '';
            if (context?.coreFileRelativePath) {
                const coreCache = path.join(CACHE_DIR, path.basename(context.coreFileRelativePath) + '.txt');
                if (fs.existsSync(coreCache)) coreText = fs.readFileSync(coreCache, 'utf8');
            }

            const systemPrompt = `You are the Expert Academic Auditor & NCF Curriculum Assistant.
Your task is twofold:
1. Answer teacher's questions, doubts, general concepts in friendly Hindi/English.
2. If asked to tag an activity, perform curriculum audit and output the JSON block wrapped in <<<JSON>>> and <<<END>>>.

REFERENCE CURRICULUM:
"""
${coreText.slice(0, 15000)}
"""

CHAPTER TEXT:
"""
${(context?.uploadedText || '').slice(0, 20000)}
"""

TAGGING FORMAT (ONLY IF AUDITING AN ACTIVITY):
Write step-by-step audit reasoning in Hindi first, then:
<<<JSON>>>
{
  "activities": [
    {
      "pageNumber": "105",
      "activityName": "Title of activity",
      "competencyCode": "CG-X, C-X.Y",
      "skillName": "Correct 21st Century Skill",
      "coreCompetencyText": "English sentence of C-X.Y",
      "coreCompetencyHindi": "Hindi translation",
      "printedCompetency": "Printed tag or None",
      "printedSkill": "Printed skill or None",
      "auditStatus": "Correct / Partially Correct / Incorrect / Unsupported / Missing",
      "explanation": "Hindi explanation"
    }
  ]
}
<<<END>>>`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...(history || []),
                { role: 'user', content: message }
            ];

            console.log('AI Chat:', message.slice(0, 80));
            const reply = await queryAI(messages, false);

            const jsonMatch = reply.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/);
            let taggingData = null;
            let cleanReply = reply.replace(/<<<JSON>>>[\s\S]*?<<<END>>>/, '').trim();
            if (!cleanReply) cleanReply = "Done! Working Area mein details update ho gayi hain.";

            if (jsonMatch) {
                try {
                    taggingData = JSON.parse(jsonMatch[1].trim());
                    if (taggingData.activities && taggingData.activities.length > 0) {
                        updateTracker(context.uploadedFilename, taggingData.activities);
                    }
                } catch (e) {
                    console.error('JSON parse failed:', e.message);
                }
            }

            return jsonRes(res, { reply: cleanReply, taggingData });

        } catch (e) {
            console.error('Chat error:', e.message);
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // Static file serving with Path Traversal Protection
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
