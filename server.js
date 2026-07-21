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

    // 1. Text files (.txt)
    if (ext === '.txt') {
        const text = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(cachePath, text, 'utf8');
        return text;
    }

    // 2. Try JS-based extraction (works locally & on cloud)
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

    // Fallback on Windows if JS module missing
    if (IS_WINDOWS) {
        return await extractTextPowerShell(filePath, cachePath);
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

// PowerShell fallback (local Windows only)
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

// Helper to update cumulative tracker
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
                { code: "1.1", desc: "C-1.1: Identifies main points and summarises from a careful listening or reading of the text" },
                { code: "1.2", desc: "C-1.2: Listens to, plans, and conducts different kinds of interviews (structured and unstructured)" },
                { code: "1.3", desc: "C-1.3: Raises probing questions about social experiences using appropriate language" },
                { code: "1.4", desc: "C-1.4: Writes different kinds of letters, essays, and reports using appropriate style and registers" },
                { code: "1.5", desc: "C-1.5: Creates content for audio, visual, or both, for different audiences and purposes" },
                { code: "2.1", desc: "C-2.1: Identifies and appreciates different forms of literature and styles of writing" },
                { code: "2.2", desc: "C-2.2: Identifies literary devices by reading a variety of literature and uses them in writing" },
                { code: "2.3", desc: "C-2.3: Expresses through speech and writing their ideas and critiques on social/cultural surroundings" },
                { code: "3.1", desc: "C-3.1: Interprets and understands basic linguistic aspects (rules) and applies them while writing" },
                { code: "3.2", desc: "C-3.2: Writes prose, poetry, and drama using appropriate style and language" },
                { code: "4.1", desc: "C-4.1: Reads, responds to, and critically reviews books of varied genres" },
                { code: "4.2", desc: "C-4.2: Uses books and other media resources effectively to find references to use in projects" },
                { code: "5.1", desc: "C-5.1: Understands the phonetics and script of the language, and how they interact" },
                { code: "5.2", desc: "C-5.2: Engages in the use of puns, rhymes, alliteration, and other wordplays" },
                { code: "5.3", desc: "C-5.3: Becomes familiar with some of the major word games in the language" }
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
            const { coreFileRelativePath, uploadedText, uploadedFilename } = JSON.parse((await parseBody(req)).toString());

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

            const chapterText = uploadedText || '';
            const activitiesArray = [];
            return jsonRes(res, { status: 'Analyse done', activities: activitiesArray });

        } catch (e) {
            console.error('Deep analyze error:', e.message);
            return jsonRes(res, { error: e.message }, 500);
        }
    }

    // POST /api/chat — smart interactive chat with tagging capability
    if (pathname === '/api/chat' && req.method === 'POST') {
        try {
            const { history, message, context } = JSON.parse((await parseBody(req)).toString());

            let coreText = '';
            if (context?.coreFileRelativePath) {
                const coreCache = path.join(CACHE_DIR, path.basename(context.coreFileRelativePath) + '.txt');
                if (fs.existsSync(coreCache)) coreText = fs.readFileSync(coreCache, 'utf8');
            }

            const systemPrompt = `You are the Expert Academic Auditor for a Class 7 English textbook.
Your task is to examine textbook activities and perform NCF curriculum tagging and audit verification.

REFERENCE CURRICULUM (English Middle Stage Competencies):
"""
${coreText.slice(0, 15000)}
"""

OFFICIAL 21ST CENTURY SKILLS LIST & DEFINITIONS:
Use ONLY these exact skill names:
1. "Critical Thinking" - Objective analysis of information, reasoning, judging, and problem solving.
2. "Creativity and Innovation" - Generating new/unique/improved ideas, shifting perspectives, artistic/design innovation.
3. "Collaboration" - Working effectively and respectfully in diverse teams towards shared goals.
4. "Communication" - Expressing opinions, needs, and desires clearly (verbally/non-verbally), active listening.
5. "Information Literacy" - Accessing, critically evaluating, and managing traditional or digital information.
6. "Media Literacy" - Analyzing the purpose of media messages, interpreting media, utilizing media tools.
7. "Technology Literacy" - Using digital devices, networks, and software to research and organize.
8. "Flexibility and Adaptability" - Adapting to new roles, changing priorities, dealing positively with setbacks.
9. "Leadership and Responsibility" - Guiding/influencing others, managing teamwork, demonstrating civic duty and responsibility.
10. "Initiative and Self-Direction" - Setting goals, working independently, self-motivation, lifelong learning.
11. "Productivity and Accountability" - Meeting deadlines, delivering quality results, taking ownership of outcomes.
12. "Social and Cross-Cultural Interaction" - Communicating and working collaboratively across diverse cultures/backgrounds.

CHAPTER / ACTIVITY TEXT TO AUDIT:
"""
${(context?.uploadedText || '').slice(0, 20000)}
"""

AUDIT PROCESS & RULES:
1. Examine the activity requested by the teacher. Check the student's actual required action.
2. Read the CHAPTER TEXT carefully. Do not choose randomly. Focus on what students actually do in the activity.
3. First, write down a detailed, step-by-step thinking process (Chain of Thought) in Hindi in your output text:
   - Identify which page/section of the chapter PDF this activity is on.
   - Summarize the exact action/task required of the student.
   - Walk through the REFERENCE CURRICULUM and determine the single best-fit official competency (from C-1.1 to C-5.3). Compare it with other options to explain why it fits best.
   - Walk through the 12 OFFICIAL 21ST CENTURY SKILLS and choose the best-fit skill based on student actions.
   - Find if there is any printed tag (e.g. "CG:2, C:2.2") in the activity text.
   - Conduct the audit comparison: is the printed tag Correct, Partially Correct, Incorrect, Unsupported, or Missing? Why?
4. Make sure you write this step-by-step reasoning clearly in Hindi/Hinglish in your response first. This is crucial for accuracy.
5. After your step-by-step reasoning, output the structured JSON block wrapped exactly in <<<JSON>>> and <<<END>>>.

TAGGING OUTPUT JSON FORMAT:
[Detailed step-by-step audit reasoning in Hindi]

<<<JSON>>>
{
  "activities": [
    {
      "pageNumber": "Page number in the PDF (e.g. 105 or N/A)",
      "activityName": "Exact activity name/title in textbook",
      "competencyCode": "CG-X, C-X.Y (correct official competency)",
      "skillName": "Correct 21st Century Skill name (exactly from the list of 12 skills)",
      "coreCompetencyText": "VERBATIM English sentence of the C-X.Y competency from the CG file",
      "coreCompetencyHindi": "Hindi translation of the core competency text",
      "printedCompetency": "Textbook printed competency (e.g. CG:2, C:2.2 or None)",
      "printedSkill": "Textbook printed skill name (e.g. Critical Thinking or None)",
      "auditStatus": "Correct / Partially Correct / Incorrect / Unsupported / Missing",
      "explanation": "Hindi mein explanation: student ne actual mein kya action perform kiya, isliye official competency aur skill ye aayi, aur textbook ke printed tags wrong/correct kyun hai."
    }
  ]
}
<<<END>>>

If the teacher asks a general question, respond normally without the JSON block.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...(history || []),
                { role: 'user', content: message }
            ];

            console.log('AI Chat:', message.slice(0, 80));
            const reply = await queryAI(messages, false);

            const jsonMatch = reply.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/);
            let taggingData = null;
            let cleanReply = reply;

            if (jsonMatch) {
                try {
                    taggingData = JSON.parse(jsonMatch[1].trim());
                    cleanReply = "Done! Working Area mein details update ho gayi hain. Ab aur kahan tagging karani hai?";
                    if (taggingData.activities && taggingData.activities.length > 0) {
                        updateTracker(context.uploadedFilename, taggingData.activities);
                    }
                } catch (e) {
                    console.error('JSON parse from chat failed:', e.message);
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
    
    // Sanitize pathname to prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(BASE_DIR, safePath === '/' ? 'index.html' : safePath);
    }

    // Check that target path is within project root
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
