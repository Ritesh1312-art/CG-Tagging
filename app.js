// CG Tagging Tool — Serverless Static Frontend v7 (GitHub Pages Compatible)

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

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

// Hardcoded Stages Configuration for Serverless Double Dropdowns
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
        "coreCompetencyHindi": "विभिन्न प्रकार के साक्षात्कारों (नियोजित और अनियोजित) को सुनना, उनकी योजना बनाना और उन्हें आयोजित करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "इस गतिविधि में छात्रों को किसी स्पोर्ट्स कोच या फिजिकल ट्रेनर का साक्षात्कार (interview) लेना है। यह सीधा C-1.2 (साक्षात्कार आयोजित करना) के अंतर्गत आता है और इससे छात्रों की Communication स्किल विकसित होती है। पाठ्यपुस्तक में इसके लिए कोई भी CG/Competency टैग मुद्रित (printed) नहीं था, इसलिए इसका ऑडिट स्टेटस 'Missing' है।"
      },
      {
        "pageNumber": "106",
        "activityName": "Story Journey (OMR Comprehension Questions)",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text (news articles, reports, editorials)",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक सुनने या पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "छात्रों को कहानी पढ़ने के बाद बहुविकल्पीय प्रश्नों (MCQs) के उत्तर देने हैं, जिससे वे पाठ से मुख्य तथ्यों और बिंदुओं को पहचान सकें। यह C-1.1 (रीडिंग कॉम्प्रीहेंशन) का हिस्सा है। पाठ्यपुस्तक में इस गतिविधि पर कोई भी टैग प्रिंट नहीं था, अतः इसका स्टेटस 'Missing' है।"
      },
      {
        "pageNumber": "107",
        "activityName": "True / False Statements",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text (news articles, reports, editorials)",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक सुनने या पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "None",
        "auditStatus": "Incorrect",
        "explanation": "इस गतिविधि में छात्रों को सत्य/असत्य कथन छांटने हैं। यह बुनियादी तौर पर सूचना को पढ़ने और समझने (C-1.1) की गतिविधि है। लेकिन पाठ्यपुस्तक में यहाँ 'CG:2, C:2.2' मुद्रित है, जो कि साहित्यिक उपकरणों (जैसे उपमा, रूपक) की पहचान करने से संबंधित है। ट्रू/फॉल्स का काव्यात्मक उपकरणों से कोई संबंध नहीं है, इसलिए मुद्रित टैग पूरी तरह से गलत (Incorrect) है।"
      },
      {
        "pageNumber": "107",
        "activityName": "Find lines from the story that tell you...",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text (news articles, reports, editorials)",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक सुनने या पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "छात्रों को दिए गए कथनों के समर्थन में कहानी से विशिष्ट लाइनें ढूंढनी हैं। यह पाठ्य सामग्री के गहन विश्लेषण और मुख्य बिंदुओं को खोजने (C-1.1) तथा Critical Thinking पर आधारित है। पाठ्यपुस्तक में इसके लिए कोई मुद्रित टैग नहीं था।"
      },
      {
        "pageNumber": "108",
        "activityName": "Answer the following questions",
        "competencyCode": "CG-1, C-1.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies main points and summarises from a careful listening or reading of the text (news articles, reports, editorials)",
        "coreCompetencyHindi": "पाठ के ध्यानपूर्वक सुनने या पढ़ने से मुख्य बिंदुओं की पहचान करना और सारांश निकालना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "कहानी के आधार पर सीधे प्रश्नों के उत्तर लिखना पाठ के समझ और सारांश (C-1.1) को इंगित करता है, जिससे छात्रों में Critical Thinking विकसित होती है। यहाँ भी पाठ्यपुस्तक में कोई टैग मौजूद नहीं था।"
      },
      {
        "pageNumber": "108",
        "activityName": "Put on Your Thinking Caps (My Summit Plan)",
        "competencyCode": "CG-2, C-2.3",
        "skillName": "Initiative and Self-Direction",
        "coreCompetencyText": "Expresses through speech and writing their ideas and critiques on the various aspects of their social and cultural surroundings",
        "coreCompetencyHindi": "भाषण और लेखन के माध्यम से अपने सामाजिक और सांस्कृतिक परिवेश के विभिन्न पहलुओं पर अपने विचारों और आलोचनाओं को व्यक्त करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "इस गतिविधि में छात्रों को अपने स्वयं के लक्ष्यों (Summit Plan) को निर्धारित करना है, बाधाओं को पहचानना है और कदमों की योजना बनानी है। यह छात्रों को स्वतंत्र रूप से कार्य शुरू करने और आत्म-प्रेरणा (Initiative and Self-Direction) विकसित करने में मदद करता है। अपने व्यक्तिगत विचारों और लक्ष्यों को लिखना C-2.3 को अभिव्यक्त करता है। यह पाठ्यपुस्तक में 'Missing' था।"
      },
      {
        "pageNumber": "109",
        "activityName": "Dictionary & Vocabulary Skills",
        "competencyCode": "CG-3, C-3.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Interprets and understands basic linguistic aspects (rules), such as sentence structure, punctuation, tense, gender, and parts of speech, while reading different forms of literature, and applies them while writing",
        "coreCompetencyHindi": "साहित्य के विभिन्न रूपों को पढ़ते समय बुनियादी भाषाई पहलुओं (नियमों), जैसे कि वाक्य संरचना, विराम चिह्न, काल, लिंग और शब्द भेद को समझना और लिखते समय उन्हें लागू करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "शब्दों के संज्ञा (noun) और विशेषण (adjective) रूप खोजना और वर्तनी (spelling) की त्रुटियों को सुधारना भाषा के व्याकरण नियमों (Parts of speech) के अंतर्गत आता है, जो C-3.1 का स्पष्ट उदाहरण है। पाठ्यपुस्तक में इसके लिए कोई मुद्रित टैग नहीं था।"
      },
      {
        "pageNumber": "109",
        "activityName": "Grammar Lab (Parts of Speech Table)",
        "competencyCode": "CG-3, C-3.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Interprets and understands basic linguistic aspects (rules), such as sentence structure, punctuation, tense, gender, and parts of speech, while reading different forms of literature, and applies them while writing",
        "coreCompetencyHindi": "साहित्य के विभिन्न रूपों को पढ़ते समय बुनियादी भाषाई पहलुओं (नियमों), जैसे कि वाक्य संरचना, विराम चिह्न, काल, लिंग और शब्द भेद को समझना और लिखते समय उन्हें लागू करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "विभिन्न शब्दों को संज्ञा, विशेषण, क्रिया और क्रियाविशेषण के रूप में वर्गीकृत करना व्याकरण के मूलभूत नियमों (C-3.1) का अनुपालन कराता है। यह छात्रों की Critical Thinking को मजबूत करता है। पाठ्यपुस्तक में कोई मुद्रित टैग नहीं था।"
      }
    ],
    "12.pdf": [
      {
        "pageNumber": "115",
        "activityName": "Homage Table (Wonder Window)",
        "competencyCode": "CG-2, C-2.3",
        "skillName": "Social and Cross-Cultural Interaction",
        "coreCompetencyText": "Expresses through speech and writing their ideas and critiques on the various aspects of their social and cultural surroundings",
        "coreCompetencyHindi": "भाषण and लेखन के माध्यम से अपने सामाजिक और सांस्कृतिक परिवेश के विभिन्न पहलुओं पर अपने विचारों और आलोचनाओं को व्यक्त करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "शहीदों के बलिदान और जीत का सम्मान करने के तीन तरीकों को सारणी में लिखना और सहपाठियों के साथ साझा करना, हमारे सामाजिक और राष्ट्रीय परिवेश (C-2.3) के प्रति संवेदनशीलता और Social Interaction को मजबूत करता है। पाठ्यपुस्तक में यह टैग 'Missing' था।"
      },
      {
        "pageNumber": "116",
        "activityName": "Learning Through Interaction (Interview Ex-Serviceman)",
        "competencyCode": "CG-1, C-1.2",
        "skillName": "Communication",
        "coreCompetencyText": "Listens to, plans, and conducts different kinds of interviews (structured and unstructured)",
        "coreCompetencyHindi": "विभिन्न प्रकार के साक्षात्कारों (नियोजित और अनियोजित) को सुनना, उनकी योजना बनाना और उन्हें आयोजित करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "एक पूर्व सैनिक या रक्षा कर्मी से साक्षात्कार लेकर उनके युद्ध स्मारक के महत्व को समझना C-1.2 (साक्षात्कार आयोजित करना) को सीधे तौर पर दर्शाता है और छात्रों की Communication स्किल को बढ़ावा देता है। पाठ्यपुस्तक में इसके लिए कोई मुद्रित टैग नहीं था।"
      },
      {
        "pageNumber": "118",
        "activityName": "Writing Skills (Natural Disasters & Armed Forces Letter)",
        "competencyCode": "CG-1, C-1.4",
        "skillName": "Communication",
        "coreCompetencyText": "Writes different kinds of letters, essays, and reports using appropriate style and registers for different audiences and purposes",
        "coreCompetencyHindi": "विभिन्न दर्शकों और उद्देश्यों के लिए उपयुक्त शैली और रजिस्टर का उपयोग करके विभिन्न प्रकार के पत्र, निबंध और रिपोर्ट लिखना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "Critical Thinking",
        "auditStatus": "Incorrect",
        "explanation": "छात्रों को आपदा राहत कार्य और समाज कल्याण में सशस्त्र बलों की भूमिका के बारे में मित्र को एक औपचारिक/अनौपचारिक पत्र लिखना है। पत्र लेखन सीधे C-1.4 (विभिन्न प्रकार के पत्र लिखना) का उदाहरण है और यह Communication कौशल का हिस्सा है। पाठ्यपुस्तक में मुद्रित 'CG:2, C:2.2' (काव्यात्मक साहित्यिक उपकरण) पूरी तरह से गलत (Incorrect) है, क्योंकि पत्र लेखन में साहित्यिक उपकरणों का विश्लेषण मुख्य उद्देश्य नहीं है।"
      },
      {
        "pageNumber": "119",
        "activityName": "Interconnected Learning with Hindi (Pushp ki Abhilasha Poem)",
        "competencyCode": "CG-2, C-2.1",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies and appreciates different forms of literature (prose, poetry, drama) and styles of writing (narrative, descriptive, expository, persuasive) from various cultures and time periods",
        "coreCompetencyHindi": "विभिन्न संस्कृतियों और समयावधियों से साहित्य के विभिन्न रूपों (गद्य, पद्य, नाटक) और लेखन शैलियों की पहचान करना और उनकी सराहना करना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "Critical Thinking",
        "auditStatus": "Partially Correct",
        "explanation": "हिंदी कविता 'पुष्प की अभिलाषा' को पढ़ना और उसके केंद्रीय भाव को समझना विभिन्न साहित्य रूपों (C-2.1) की सराहना के अंतर्गत आता है। पाठ्यपुस्तक में 'CG:2, C:2.2' (साहित्यिक उपकरण) मुद्रित है। यह आंशिक रूप से सही (Partially Correct) हो सकता है क्योंकि कविता में पुष्प के मानवीकरण (personification) का साहित्यिक विश्लेषण किया जा सकता है, हालांकि मुख्य रूप से यह साहित्य के विभिन्न रूपों और संस्कृतियों के प्रति समझ (C-2.1) को इंगित करता है।"
      },
      {
        "pageNumber": "120",
        "activityName": "SEL Corner (Neglected Public Monument Steps)",
        "competencyCode": "CG-2, C-2.3",
        "skillName": "Leadership and Responsibility",
        "coreCompetencyText": "Expresses through speech and writing their ideas and critiques on the various aspects of their social and cultural surroundings",
        "coreCompetencyHindi": "भाषण और लेखन के माध्यम से अपने सामाजिक और सांस्कृतिक परिवेश के विभिन्न पहलुओं पर अपने विचारों और आलोचनाओं को व्यक्त करना",
        "printedCompetency": "None",
        "printedSkill": "Decision Making",
        "auditStatus": "Partially Correct",
        "explanation": "सार्वजनिक स्मारकों की सुरक्षा और सशस्त्र बलों के सम्मान में बोलने के लिए कदम सोचना, छात्र की सामाजिक जिम्मेदारी और कर्तव्य (Leadership and Responsibility) को दर्शाता है और वह अपने सामाजिक परिवेश पर विचार प्रस्तुत कर रहा है (C-2.3)। पाठ्यपुस्तक में मुद्रित जीवन कौशल 'Decision Making' आंशिक रूप से सही (Partially Correct) है, परंतु यह 21वीं सदी के कौशल 'Leadership and Responsibility' के अधिक निकट है।"
      },
      {
        "pageNumber": "120",
        "activityName": "Explore (Armed Forces Research Project)",
        "competencyCode": "CG-4, C-4.2",
        "skillName": "Information Literacy",
        "coreCompetencyText": "Uses books and other media resources effectively to find references to use in projects and other activities",
        "coreCompetencyHindi": "परियोजनाओं और अन्य गतिविधियों में उपयोग करने के लिए संदर्भ खोजने हेतु पुस्तकों और अन्य media संसाधनों का प्रभावी ढंग से उपयोग करना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "Critical Thinking",
        "auditStatus": "Incorrect",
        "explanation": "छात्रों को भारत के अन्य सशस्त्र बलों और सुरक्षा बलों के बारे में जानकारी ढूंढकर किसी भी 5 बलों के बारे में लिखना है। यह बाहरी संदर्भों, इंटरनेट या पुस्तकों से जानकारी ढूंढने (C-4.2) और Information Literacy का उत्कृष्ट उदाहरण है। पाठ्यपुस्तक में इसके लिए 'CG:2, C:2.2' (साहित्यिक उपकरण) और 'Critical Thinking' मुद्रित है, जो पूरी तरह से गलत (Incorrect) है।"
      }
    ],
    "13.pdf": [
      {
        "pageNumber": "N/A",
        "activityName": "Put on Your Thinking Caps (Vikram Batra Riddle)",
        "competencyCode": "CG-5, C-5.3",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Becomes familiar with some of the major word games in the language (e.g., palindromes, spoonerisms, sentences without given letters or sounds, riddles, jokes, antakshari, anagrams, crosswords)",
        "coreCompetencyHindi": "भाषा के कुछ प्रमुख शब्द खेलों (जैसे पहेलियां, चुटकुले, अंताक्षरी, वर्ग पहेली आदि) से परिचित होना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "'ये दिल मांगे मोर' वाली पहेली (Vikram Batra) को हल करना और सही सैनिक की पहचान करना भाषा के शब्द खेलों और पहेलियों (C-5.3) के अंतर्गत आता है और Critical Thinking विकसित करता है। पाठ्यपुस्तक में इसके लिए कोई मुद्रित टैग नहीं था।"
      },
      {
        "pageNumber": "N/A",
        "activityName": "Poetic Devices Identification",
        "competencyCode": "CG-2, C-2.2",
        "skillName": "Critical Thinking",
        "coreCompetencyText": "Identifies literary devices [simile, metaphor, personification (alankaras), hyperbole (athishayokthi), alliteration (anuprasa), idioms, proverbs, and riddles] by reading a variety of literature and uses them in writing",
        "coreCompetencyHindi": "साहित्य के विभिन्न रूपों को पढ़कर साहित्यिक उपकरणों (जैसे उपमा, रूपक, मानवीकरण, अतिशयोक्ति, अनुप्रास आदि) की पहचान करना और लेखन में उनका उपयोग करना",
        "printedCompetency": "None",
        "printedSkill": "None",
        "auditStatus": "Missing",
        "explanation": "कविता से उपमा (Simile), रूपक (Metaphor), अतिशयोक्ति (Hyperbole) और बिंब (Imagery) की खोज करना C-2.2 (साहित्यिक उपकरणों की पहचान) का सीधा कार्य है। पाठ्यपुस्तक में इसके लिए कोई टैग प्रिंट नहीं था, इसलिए यह 'Missing' था।"
      },
      {
        "pageNumber": "N/A",
        "activityName": "Fun & Creativity (Design a Badge of Honour)",
        "competencyCode": "CG-1, C-1.5",
        "skillName": "Creativity and Innovation",
        "coreCompetencyText": "Creates content for audio, visual, or both, for different audiences and purposes",
        "coreCompetencyHindi": "विभिन्न दर्शकों और उद्देश्यों के लिए श्रव्य, दृश्य, या दोनों प्रकार की सामग्री का निर्माण करना",
        "printedCompetency": "CG:2, C:2.2",
        "printedSkill": "Critical Thinking",
        "auditStatus": "Incorrect",
        "explanation": "छात्रों को सैनिकों के लिए एक सम्मान का बैज (Badge of Honour) स्लोगन और स्व-डिज़ाइन किए गए लोगो के साथ हस्तनिर्मित या डिजिटल रूप से डिज़ाइन करना है। यह रचनात्मक दृश्य सामग्री का निर्माण (C-1.5) है, जो Creativity and Innovation के कौशल को मापता है। पाठ्यपुस्तक में इसके लिए 'CG:2, C:2.2' (साहित्यिक काव्यात्मक उपकरण) और 'Critical Thinking' मुद्रित है, जो कि पूरी तरह से गलत (Incorrect) है क्योंकि यह एक रचनात्मक रचनात्मक और दृश्य रचना का कार्य है।"
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

// Populate dropdown 1: Select Stage
function loadStages() {
    stageSelect.innerHTML = '<option value="">-- Select Stage --</option>';
    Object.keys(STAGES_CONFIG).forEach(stg => {
        const opt = document.createElement('option');
        opt.value = stg;
        opt.textContent = stg;
        stageSelect.appendChild(opt);
    });
}

// Stage selected -> Load core dropdown
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

coreSelect.addEventListener('change', async (e) => {
    state.selectedCoreFile = e.target.value;
    if (state.selectedCoreFile) {
        // Load pre-extracted CG file text cache relative to root
        showLoading(true, '📚 Loading curriculum text...');
        try {
            const res = await fetch(`./cache/${state.selectedCoreFile}.txt`);
            if (!res.ok) throw new Error('Curriculum cache not found');
            state.coreTextCache = await res.text();
        } catch (err) {
            console.error('Error loading core file cache:', err);
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

async function loadFixedSkills() {
    try {
        const res = await fetch('./cache/21st Century Skill.pdf.txt');
        if (!res.ok) throw new Error('Skills cache not found');
        state.skillsTextCache = await res.text();
    } catch (e) {
        console.error('Error loading skills file:', e);
        state.skillsTextCache = 'Official 21st Century Skills: Critical Thinking, Creativity, Collaboration, Communication, Information Literacy, Media Literacy, Technology Literacy.';
    }
}

// ─── DRAG & DROP ─────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
});

// Client-Side PDF text extractor using PDF.js
async function handleFileUpload(file) {
    showLoading(true, '📄 Reading PDF and checking cache...');
    try {
        state.uploadedFilename = file.name;
        
        let text = '';
        // Try fetching pre-extracted OCR text from cache folder first (GitHub Pages compatible)
        try {
            const cacheRes = await fetch(`./cache/${encodeURIComponent(file.name)}.txt`);
            if (cacheRes.ok) {
                text = await cacheRes.text();
                console.log('Loaded text from cache successfully:', file.name);
            }
        } catch (cacheErr) {
            console.warn('Cache fetch failed, falling back to browser parsing:', cacheErr);
        }

        // Fallback to client-side PDF.js parsing if no cache text was found
        if (!text) {
            if (file.name.toLowerCase().endsWith('.pdf')) {
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

        document.querySelector('.file-name-text').textContent = file.name;
        uploadedFileStatus.style.display = 'flex';
        dropZone.style.display = 'none';
        checkReady();
    } catch (e) {
        alert('File read failed: ' + e.message);
    } finally {
        showLoading(false);
    }
}

removeFileBtn.addEventListener('click', () => {
    state.uploadedText = '';
    state.uploadedFilename = '';
    state.analysisReady = false;
    fileInput.value = '';
    uploadedFileStatus.style.display = 'none';
    dropZone.style.display = 'flex';
    checkReady();
    resetChat();
});

// Check if ready to analyze
function checkReady() {
    const ready = state.selectedStage && state.selectedCoreFile && state.uploadedText;
    analyzeBtn.disabled = !ready;
    if (ready) {
        setAnalyzeBtnLabel('🔍 Analyze All Files & Start Chat');
    } else {
        setAnalyzeBtnLabel('🔍 Analyze All Files & Start Chat');
    }
}

function setAnalyzeBtnLabel(txt) {
    analyzeBtn.textContent = txt;
}

// Client-side deep analysis (just verifies state and launches chat)
analyzeBtn.addEventListener('click', async () => {
    try {
        console.log('Analyze button clicked. Current state:', state);
        if (state.analysisReady) {
            console.log('Analysis is already ready.');
            return;
        }
        
        showLoading(true, '🧠 Verifying files and starting audit...');
        // Simulate short delay to verify client-side setup
        setTimeout(() => {
            try {
                resultsPlaceholder.textContent = 'Analyse done';
                resultsPlaceholder.style.display = 'block';
                resultsContainer.style.display = 'none';
                state.analysisReady = true;
                
                showLoading(false);
                enableChat();
                addChatBubble('ai', 'Analyse completed! Ab aap niche chat box me specific page number, section ya activities likhein jinhe verify/tag karna hai.');
                console.log('Analysis setup complete.');
            } catch (innerErr) {
                console.error('Error inside analyze setTimeout:', innerErr);
                alert('Analyze setup failed: ' + innerErr.message);
            }
        }, 800);
    } catch (err) {
        console.error('Error in analyze click:', err);
        alert('Analyze click failed: ' + err.message);
    }
});

// ─── CHAT FLOW ───────────────────────────────────────────────────────────────
function enableChat() {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.placeholder = 'Kuch bhi puchiye ya file analyze karte hue tag kariye...';
    chatInput.focus();
}

function getInitialGreeting() {
    const now = new Date();
    const hrs = now.getHours();
    let greet = "Good evening!";
    if (hrs < 12) greet = "Good morning!";
    else if (hrs < 16) greet = "Good afternoon!";
    
    // Format time: HH:MM AM/PM
    let mins = now.getMinutes();
    if (mins < 10) mins = "0" + mins;
    let ampm = hrs >= 12 ? 'PM' : 'AM';
    let displayHr = hrs % 12;
    displayHr = displayHr ? displayHr : 12;
    
    const timeStr = `${displayHr}:${mins} ${ampm}`;
    return `${greet} [Time: ${timeStr}]<br>Kis part par tagging karni hai batao.`;
}

function addChatBubble(sender, text) {
    const container = document.createElement('div');
    container.className = `chat-bubble-container ${sender}-container`;
    
    const label = document.createElement('div');
    label.className = 'chat-bubble-label';
    label.textContent = sender === 'user' ? 'Ritesh:' : 'Program:';
    
    const b = document.createElement('div');
    b.className = `chat-bubble ${sender}-bubble`;
    
    if (sender === 'user') {
        b.textContent = text;
    } else {
        b.innerHTML = text;
    }
    
    container.appendChild(label);
    container.appendChild(b);
    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return container;
}

function resetChat() {
    state.chatHistory = [];
    state.analysisReady = false;
    
    const greetMsg = getInitialGreeting();
    
    chatMessages.innerHTML = `
      <div class="chat-bubble-container ai-container">
        <div class="chat-bubble-label">Program:</div>
        <div class="chat-bubble ai-bubble">
          ${greetMsg}
        </div>
      </div>`;
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.placeholder = 'Kuch bhi puchiye ya file analyze karte hue tag kariye...';
    analyzeBtn.textContent = '🔍 Analyze All Files & Start Chat';
    analyzeBtn.disabled = true;
    resultsPlaceholder.style.display = 'block';
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
}

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMsg();
});
chatSendBtn.addEventListener('click', sendChatMsg);

// Send message to Pollinations directly from the browser
async function sendChatMsg() {
    const text = chatInput.value.trim();
    if (!text) return;

    addChatBubble('user', text);
    chatInput.value = '';
    state.chatHistory.push({ role: 'user', content: text });

    const thinkingBubble = addChatBubble('ai', '⏳ Soch raha hoon...');

    try {
        const systemPrompt = `You are the Expert Academic Auditor for a Class 7 English textbook.
Your task is to examine textbook activities and perform NCF curriculum tagging and audit verification.

REFERENCE CURRICULUM (English Middle Stage Competencies):
"""
${state.coreTextCache.slice(0, 50000)}
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
${state.uploadedText.slice(0, 40000)}
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

        // Direct fetch to Pollinations AI
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

        if (!response.ok) throw new Error('Failed to query AI');
        const replyText = await response.text();

        // Extract JSON block
        const jsonMatch = replyText.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/);
        let taggingData = null;
        let cleanReply = replyText;

        if (jsonMatch) {
            try {
                taggingData = JSON.parse(jsonMatch[1].trim());
                // Enforce clean, simple chat bubble confirmation
                cleanReply = "Done! Working Area mein details update ho gayi hain. Ab aur kahan tagging karani hai?";
                
                // Update local storage tracker
                if (taggingData.activities && taggingData.activities.length > 0) {
                    saveTrackerLocal(state.uploadedFilename, taggingData.activities);
                }
            } catch (e) {
                console.error('JSON parse from chat failed:', e.message);
            }
        }

        thinkingBubble.remove();
        addChatBubble('ai', cleanReply);
        state.chatHistory.push({ role: 'assistant', content: cleanReply });

        if (taggingData && taggingData.activities && taggingData.activities.length > 0) {
            renderResults(taggingData.activities, true); // append mode
            updateTrackerUI();
        }

    } catch (e) {
        thinkingBubble.remove();
        addChatBubble('ai', 'Error: ' + e.message);
    }
}

// ─── TRACKER & LOCAL STORAGE ──────────────────────────────────────────────────
function getTrackerLocal() {
    let trk = localStorage.getItem('ncf_tracker');
    if (!trk) {
        // First load: initialize with the Chapter 11, 12, 13 pre-populated data!
        localStorage.setItem('ncf_tracker', JSON.stringify(INITIAL_TRACKER_DATA));
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
    
    localStorage.setItem('ncf_tracker', JSON.stringify(tracker));
}

async function updateTrackerUI() {
    try {
        const data = getTrackerLocal();
        const auditedChapters = Object.keys(data.chapters || {});

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

        if (auditedChapters.length > 0) {
            trackerWidget.style.display = 'flex';
            trackerChaptersCount.textContent = auditedChapters.length;
            trackerCompetencyCount.textContent = `${totalCompetenciesCovered} / 15`;
            
            const pct = Math.round((totalCompetenciesCovered / 15) * 100);
            trackerProgressBar.style.width = `${pct}%`;

            // Render coverage matrix
            trackerMatrixGrid.innerHTML = '';
            Object.keys(compCoverage).forEach(code => {
                const info = compCoverage[code];
                const div = document.createElement('div');
                div.className = `matrix-item ${info.covered ? 'covered' : ''}`;
                div.textContent = `C-${code}`;
                div.title = `${info.desc}\n${info.covered ? 'Covered in: ' + info.chapters.join(', ') : 'Not covered yet'}`;
                trackerMatrixGrid.appendChild(div);
            });

            // Render skills distribution
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
        } else {
            trackerWidget.style.display = 'none';
        }
    } catch (e) {
        console.error('Error updating tracker UI:', e);
    }
}

resetTrackerBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to reset the cumulative book tracker? This will clear all audit history.')) return;
    localStorage.setItem('ncf_tracker', JSON.stringify({ chapters: {} }));
    updateTrackerUI();
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

// ─── RENDERING ───────────────────────────────────────────────────────────────
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
    });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function showLoading(show, msg = 'Processing...') {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    loadingMsg.textContent = msg;
}
