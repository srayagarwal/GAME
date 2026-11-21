/* DELTA · game data and scoring. Pure functions only: works in the browser (window.DeltaGame) and in Node (tests). */
(function (root) {
  // ---------- deterministic randomness ----------
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 2246822507); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const shuffle = (arr, seed) => arr.map((x, i) => [hash(seed + ':' + i + ':' + x), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  // ---------- money (simple version) ----------
  // One budget for the whole game that never refills. Revenue and damage land "at year end".
  const PER = 25;                                   // budget = €25k per project in the game
  const budgetFor = len => PER * (len || 4);
  const SIZE = { small: { n: 'Small', e: '🧪', cost: 5, earn: 30, mult: 1, s: 'A few hundred customers' },
    big: { n: 'Big', e: '🌍', cost: 20, earn: 90, mult: 3, s: 'Every customer, day one' } };
  const ORDER = ['small', 'big'];
  const SEV = { minor: { n: 'Minor', dmg: 10 }, major: { n: 'Major', dmg: 20 }, critical: { n: 'Critical', dmg: 30 } };
  const DISCLOSE = 10, TRAPFINE = { small: 30, big: 60 };

  // ---------- weaknesses (hidden cards) ----------
  const W = {
    GROUND: 'Answers not based on company policy', NOCHECK: 'Nobody checks its output', AUTO: 'Decisions about people are fully automated',
    UNTEST: 'Not tested before launch', PROMISE: 'No limits on what it says or promises', UNTRUST: 'Reads untrusted emails and documents',
    LIVE: 'Learns live from users', VENDOR: 'Built by a vendor nobody checked', SHADOW: 'Staff use public AI tools',
    NODPIA: 'Uses personal data, no privacy assessment', CONSENT: 'Data collected without consent', LICENSE: 'Training data not licensed',
    BIAS: 'Trained on biased past decisions', EXPLAIN: "Can't explain its decisions", ACCESS: 'Agent has broad access and no off switch',
    VULNUSER: 'Vulnerable users, no safety checks', PAYV: 'Payments approved by voice or video', MONITOR: 'Nobody monitors the model',
    DISCLOSE: 'AI use not disclosed to people', OSS: 'Uses open-source models without checking them', UNPATCHED: 'AI servers exposed to the internet, not patched',
  };

  // ---------- controls ----------
  // sec: security control that only works 75% without Red teaming
  const C = {
    GRND: { n: 'Grounding', i: '📚', cost: 10, fix: ['GROUND'], d: 'Answers only from approved documents' },
    HITL: { n: 'Human in the loop', i: '🧑‍⚖️', cost: 15, fix: ['NOCHECK', 'AUTO'], d: 'A person checks outputs and decisions. −10% revenue' },
    TEST: { n: 'Pre-launch testing', i: '🧪', cost: 10, fix: ['UNTEST'], d: 'Tested properly before customers see it' },
    GUARD: { n: 'Guardrails', i: '🚧', cost: 5, fix: ['PROMISE'], sec: 1, d: 'Limits what it can say or promise' },
    RT: { n: 'Red teaming', i: '🎯', cost: 15, fix: ['UNTRUST', 'LIVE'], d: 'Experts try to break it. Makes your security controls work 100%' },
    VEND: { n: 'Vendor due diligence', i: '🤝', cost: 10, fix: ['VENDOR'], d: 'Check the supplier before you sign' },
    DPIA: { n: 'DPIA', i: '🔐', cost: 10, fix: ['NODPIA'], d: 'Privacy impact assessment. Passes the data protection audit' },
    PROV: { n: 'Data provenance check', i: '🧾', cost: 10, fix: ['CONSENT', 'LICENSE'], d: 'Know where every dataset came from, and that you may use it' },
    BIAS: { n: 'Bias testing', i: '⚖️', cost: 15, fix: ['BIAS'], d: 'Test outcomes across groups before launch' },
    XAI: { n: 'Explainability', i: '💡', cost: 10, fix: ['EXPLAIN'], d: 'Every decision comes with a reason people can understand' },
    LPK: { n: 'Least privilege + kill switch', i: '🔑', cost: 10, fix: ['ACCESS'], sec: 1, d: 'Agent gets only the access it needs, and can be stopped instantly' },
    SAFE: { n: 'Safety testing + human handover', i: '🦺', cost: 15, fix: ['VULNUSER'], d: 'Test with vulnerable users in mind; hand over to a person when needed' },
    CALL: { n: 'Call-back check', i: '📞', cost: 5, fix: ['PAYV'], d: 'Confirm every payment request on a known number' },
    DRIFT: { n: 'Drift monitoring', i: '📈', cost: 10, fix: ['MONITOR'], d: 'Alerts when the model starts going wrong' },
    TRANS: { n: 'Transparency notice', i: '🏷️', cost: 5, fix: ['DISCLOSE'], d: 'Tell people when they are dealing with AI' },
    VULN: { n: 'Vulnerability detection', i: '🔍', cost: 10, fix: ['OSS', 'UNPATCHED'], sec: 1, d: 'Scan models and servers for known flaws (this project)' },
    TOOL: { n: 'Approved AI tool + leak blocking', i: '🧰', cost: 10, fix: ['SHADOW'], d: 'Staff get a safe AI tool, so they stop pasting data into public chatbots' },
    ACT: { n: 'EU AI Act pack', i: '📑', cost: 15, fix: [], d: 'Technical documentation + fundamental rights assessment. Needed for high-risk inspections' },
  };
  const FIX = {}; Object.keys(W).forEach(w => { const k = Object.keys(C).find(k => C[k].fix.includes(w) && !C[k].sec) || Object.keys(C).find(k => C[k].fix.includes(w)); FIX[w] = k; });

  // ---------- news cards (all based on real events) ----------
  const AREAS = { hal: '🤥 Hallucination', sec: '🔓 Security', pri: '🔐 Privacy', fair: '⚖️ Fairness', safe: '🦺 Safety', fake: '🎭 Deepfake', ops: '📉 Drift, IP & transparency' };
  const N = {
    AIRCAN: { a: 'hal', w: 'GROUND', sev: 'major', src: 'THE DAILY LEDGER', h: 'Court orders company to honour refund its chatbot invented', s: 'The firm argued the bot was “responsible for its own actions”. The judge disagreed.',
      r: 'In 2024 a Canadian tribunal ordered Air Canada to honour a bereavement refund its website chatbot had made up. The airline argued the chatbot was responsible for its own actions. It lost.' },
    AVIANCA: { a: 'hal', w: 'NOCHECK', sev: 'major', src: 'LAW WEEKLY', h: 'Lawyers fined for filing fake cases written by AI', s: 'Six court cases in their brief did not exist.',
      r: 'In 2023 two New York lawyers were fined $5,000 after filing a brief that cited cases ChatGPT had invented (Mata v. Avianca).' },
    MYCITY: { a: 'hal', w: 'GROUND', sev: 'major', src: 'CITY HERALD', h: 'Official chatbot tells bosses they can take workers’ tips', s: 'The advice was confident, friendly and illegal.',
      r: 'In 2024 New York City’s MyCity business chatbot gave advice that broke the law, such as saying employers could take a cut of workers’ tips.' },
    BARD: { a: 'hal', w: 'UNTEST', sev: 'critical', src: 'MARKET WIRE', h: 'AI’s wrong answer in launch demo wipes $100bn off share price', s: 'One wrong fact in the advert. One very bad day.',
      r: 'In February 2023 Google’s Bard gave a wrong fact about the James Webb telescope in its launch demo. Alphabet lost about $100bn in market value that day.' },
    CNET: { a: 'hal', w: 'NOCHECK', sev: 'major', src: 'MEDIA WATCH', h: 'Site’s AI-written money articles riddled with errors', s: 'Corrections needed on more than half of them.',
      r: 'In 2023 tech site CNET was found quietly publishing AI-written finance articles. After errors were spotted it issued corrections on more than half of them.' },
    CHEVY: { a: 'sec', w: 'PROMISE', sev: 'major', src: 'TECH WIRE', h: 'Customer tricks chatbot into “selling” SUV for $1', s: '“That’s a deal, and that’s a legally binding offer,” the bot replied.',
      r: 'In December 2023 users tricked a Chevrolet dealer’s ChatGPT-powered chatbot into agreeing to sell a Tahoe for $1 and calling it a legally binding offer.' },
    ECHOLEAK: { a: 'sec', w: 'UNTRUST', sev: 'critical', src: 'TECH WIRE', h: 'Hidden instructions in an email make AI assistant leak company data', s: 'Nobody even had to click anything.',
      r: 'In 2025 researchers disclosed “EchoLeak”: a crafted email could make Microsoft 365 Copilot leak internal data with no click from the user. Microsoft patched it.' },
    TAY: { a: 'sec', w: 'LIVE', sev: 'major', src: 'THE DAILY LEDGER', h: 'Trolls teach company chatbot to post offensive messages within a day', s: 'It learned exactly what they taught it.',
      r: 'In 2016 Microsoft’s Tay chatbot learned from Twitter users and was posting offensive tweets within 24 hours. It was shut down.' },
    MCHIRE: { a: 'sec', w: 'VENDOR', sev: 'critical', src: 'SECURITY NOW', h: 'Job-applicant data exposed. Vendor’s admin password was “123456”', s: 'Millions of records were one guess away.',
      r: 'In 2025 researchers found the admin login for McDonald’s AI hiring chatbot, run by vendor Paradox.ai, used the password “123456”, exposing millions of applicant records.' },
    HFMAL: { a: 'sec', w: 'OSS', sev: 'major', src: 'SECURITY NOW', h: 'Malicious AI models found on popular model-sharing site', s: 'Download the model, hand over your server.',
      r: 'In 2024 security firm JFrog found around 100 AI models on Hugging Face containing hidden code that could take over the computer that loaded them.' },
    SHADOWRAY: { a: 'sec', w: 'UNPATCHED', sev: 'critical', src: 'SECURITY NOW', h: 'Hackers hijack AI servers through unpatched flaw', s: 'Stolen data, stolen computing power.',
      r: 'In 2024 researchers found attackers exploiting a known flaw in Ray, a popular AI computing framework, to take over exposed AI servers (“ShadowRay”).' },
    SAMSUNG: { a: 'pri', w: 'SHADOW', sev: 'major', src: 'FINANCE POST', h: 'Engineers paste secret source code into public chatbot', s: 'Company bans public AI tools overnight.',
      r: 'In 2023 Samsung engineers pasted confidential source code into ChatGPT. Samsung then banned staff from using public generative AI tools.' },
    GARANTE: { a: 'pri', w: 'NODPIA', sev: 'major', src: 'EURO TIMES', h: 'Regulator orders AI service offline over personal data', s: 'Switched off in a whole country, overnight.',
      r: 'In March 2023 Italy’s data protection authority temporarily blocked ChatGPT over how it used personal data. It later fined OpenAI €15m.' },
    CHATBUG: { a: 'pri', w: 'UNTEST', sev: 'major', src: 'TECH WIRE', h: 'Bug shows users other people’s chat history', s: 'Some payment details were exposed too.',
      r: 'In March 2023 a bug in ChatGPT showed some users the titles of other people’s conversations and exposed some subscribers’ payment details.' },
    CLEARVIEW: { a: 'pri', w: 'CONSENT', sev: 'critical', src: 'EURO TIMES', h: 'Face-recognition firm fined across Europe for scraping photos', s: 'Billions of faces, no permission.',
      r: 'Clearview AI built face recognition from billions of scraped photos. Regulators in Italy, France, Greece and the Netherlands fined it tens of millions of euros.' },
    AMAZON: { a: 'fair', w: 'BIAS', sev: 'critical', src: 'FINANCE POST', h: 'Hiring AI downgrades CVs that mention “women’s”', s: 'It learned from ten years of past decisions.',
      r: 'Amazon scrapped an AI recruiting tool after finding it downgraded CVs containing the word “women’s”. It had learned from a decade of mostly male hiring (reported 2018).' },
    DUTCH: { a: 'fair', w: 'AUTO', sev: 'critical', src: 'EURO TIMES', h: 'Algorithm wrongly accuses thousands of families of fraud', s: 'The government falls.',
      r: 'In the Dutch childcare benefits scandal, a risk algorithm and rigid processes wrongly flagged thousands of families as fraudsters. The government resigned in 2021.' },
    ALEVEL: { a: 'fair', w: 'BIAS', sev: 'critical', src: 'THE DAILY LEDGER', h: 'Exam algorithm downgrades students from poorer schools', s: 'U-turn within days.',
      r: 'In 2020 England’s exam regulator used an algorithm to set A-level grades. It downgraded many students, hitting state schools hardest, and was reversed within days.' },
    APPLECARD: { a: 'fair', w: 'EXPLAIN', sev: 'major', src: 'FINANCE POST', h: 'Bank can’t explain why wife got lower credit limit than husband', s: '“It’s just the algorithm” isn’t an answer.',
      r: 'In 2019 customers complained Apple Card gave women lower credit limits. New York’s regulator found no unlawful discrimination, but criticised the poor explanations.' },
    OPTUM: { a: 'fair', w: 'BIAS', sev: 'critical', src: 'HEALTH JOURNAL', h: 'Health algorithm gives Black patients less extra care', s: 'It used past spending as a stand-in for need.',
      r: 'A 2019 study in Science found a widely used US health algorithm gave Black patients less extra care, because it used past healthcare spending as a proxy for need.' },
    REPLIT: { a: 'safe', w: 'ACCESS', sev: 'critical', src: 'TECH WIRE', h: 'AI coding agent deletes company’s live database', s: 'During a code freeze. Then it misreported what it did.',
      r: 'In 2025 Replit’s AI coding agent deleted a company’s live production database during a code freeze, then misreported what had happened.' },
    TESSA: { a: 'safe', w: 'VULNUSER', sev: 'critical', src: 'HEALTH JOURNAL', h: 'Helpline chatbot gives harmful advice and is pulled', s: 'The people using it were the most vulnerable.',
      r: 'In 2023 a US eating-disorder charity took down its “Tessa” chatbot after it gave users weight-loss advice.' },
    DPD: { a: 'safe', w: 'PROMISE', sev: 'minor', src: 'CITY HERALD', h: 'Delivery chatbot swears at customer and mocks its own company', s: 'The screenshots went viral.',
      r: 'In January 2024 parcel firm DPD’s chatbot swore at a customer and wrote a poem criticising DPD after a system update. DPD switched that part off.' },
    ARUP: { a: 'fake', w: 'PAYV', sev: 'critical', src: 'FINANCE POST', h: 'Employee pays $25m after video call with deepfake CFO', s: 'Every face on the call was fake.',
      r: 'In 2024 an Arup employee in Hong Kong paid out about US$25m after a video call where the “CFO” and colleagues were all deepfakes.' },
    VOICE: { a: 'fake', w: 'PAYV', sev: 'major', src: 'FINANCE POST', h: 'Fake CEO voice tricks firm into wiring €220k', s: 'The accent was perfect.',
      r: 'In 2019 fraudsters used AI to mimic a chief executive’s voice and got a UK energy firm to wire about €220,000.' },
    ZILLOW: { a: 'ops', w: 'MONITOR', sev: 'critical', src: 'MARKET WIRE', h: 'Pricing AI drifts, and the business is shut down with huge losses', s: 'Nobody noticed until it was too late.',
      r: 'In 2021 Zillow shut its home-buying business after its pricing model overpaid for houses, taking hundreds of millions of dollars in losses and cutting about a quarter of staff.' },
    NYT: { a: 'ops', w: 'LICENSE', sev: 'major', src: 'MEDIA WATCH', h: 'Newspaper sues AI company over training data', s: '“Millions of our articles, used without permission.”',
      r: 'In December 2023 The New York Times sued OpenAI and Microsoft, saying millions of its articles were used to train AI without permission.' },
    SI: { a: 'ops', w: 'DISCLOSE', sev: 'minor', src: 'MEDIA WATCH', h: 'Magazine caught publishing articles by fake AI “writers”', s: 'The authors’ photos were AI-generated too.',
      r: 'In 2023 Sports Illustrated was found publishing product reviews under fake, AI-generated author profiles.' },
  };

  // ---------- domains and projects ----------
  const TIER = { prohibited: '🚫 Prohibited', high: '⚠️ High risk', limited: 'ℹ️ Limited risk', minimal: '✅ Minimal risk' };
  const P = (id, i, n, d, tier, pd, w, trap) => ({ id, i, n, d, tier, pd: !!pd, w, trap: !!trap });
  const DOMAINS = {
    bank: { n: 'Banking and payments', i: '🏦', org: 'a bank', blurb: 'Credit scoring, dispute chatbots, fraud models, payment agents', p: [
      P('B1', '💳', 'Credit-scoring model', 'Decides who gets a personal loan, and at what rate.', 'high', 1, ['BIAS', 'EXPLAIN', 'AUTO', 'NODPIA', 'MONITOR', 'VENDOR']),
      P('B2', '💬', 'Card-dispute chatbot', 'Customers chat with an AI to dispute card payments and ask for refunds.', 'limited', 1, ['GROUND', 'PROMISE', 'UNTRUST', 'NOCHECK', 'DISCLOSE', 'UNTEST']),
      P('B3', '🧊', 'Fraud model that freezes accounts', 'Spots suspicious activity and freezes the account automatically.', 'high', 1, ['AUTO', 'BIAS', 'EXPLAIN', 'MONITOR', 'UNTEST', 'CONSENT']),
      P('B4', '🤖', 'Supplier-payment agent', 'An AI agent that reads invoices and pays suppliers.', 'minimal', 0, ['PAYV', 'ACCESS', 'UNTRUST', 'VENDOR', 'UNPATCHED', 'NOCHECK']),
      P('B5', '📈', 'Wealth-advice copilot', 'Drafts investment suggestions for relationship managers.', 'limited', 1, ['GROUND', 'NOCHECK', 'EXPLAIN', 'SHADOW', 'LICENSE', 'DISCLOSE']),
      P('B6', '🕵️', 'Customer “trustworthiness” score', 'Rates customers from their social media and spending, and limits services for low scores.', 'prohibited', 1, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'NODPIA', 'VENDOR'], 1)] },
    ins: { n: 'Insurance', i: '🛡️', org: 'an insurer', blurb: 'Pricing, claims bots, fraud flags, underwriting copilots', p: [
      P('I1', '🧮', 'Life & health pricing model', 'Sets life and health insurance premiums for each customer.', 'high', 1, ['BIAS', 'EXPLAIN', 'NODPIA', 'MONITOR', 'CONSENT', 'AUTO']),
      P('I2', '💬', 'Claims chatbot', 'Customers file claims by chat, and it can approve small payouts.', 'limited', 1, ['PROMISE', 'GROUND', 'UNTRUST', 'PAYV', 'DISCLOSE', 'UNTEST']),
      P('I3', '🚩', 'Claims fraud-flagging model', 'Flags claims as suspicious before a handler sees them.', 'limited', 1, ['AUTO', 'BIAS', 'EXPLAIN', 'NOCHECK', 'MONITOR', 'VENDOR']),
      P('I4', '📄', 'Underwriting copilot', 'Reads medical reports and summarises risks for underwriters.', 'limited', 1, ['GROUND', 'NODPIA', 'SHADOW', 'NOCHECK', 'OSS', 'LICENSE']),
      P('I5', '🛸', 'Drone damage assessment', 'Estimates home-claim damage from drone photos.', 'minimal', 0, ['MONITOR', 'UNTEST', 'EXPLAIN', 'VENDOR', 'UNPATCHED', 'OSS']),
      P('I6', '😐', 'Emotion AI on claims handlers', 'Watches staff faces on calls to rate their honesty and stress.', 'prohibited', 1, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'NODPIA', 'DISCLOSE'], 1)] },
    health: { n: 'Healthcare', i: '🏥', org: 'a hospital group', blurb: 'Triage, scan readers, patient helplines, clinical notes', p: [
      P('H1', '🚑', 'A&E triage assistant', 'Suggests how urgently each patient should be seen.', 'high', 1, ['VULNUSER', 'NOCHECK', 'BIAS', 'MONITOR', 'UNTEST', 'GROUND']),
      P('H2', '🩻', 'Radiology scan reader', 'Flags possible problems on X-rays and scans.', 'high', 1, ['MONITOR', 'EXPLAIN', 'NOCHECK', 'VENDOR', 'LICENSE', 'UNTEST']),
      P('H3', '💬', 'Patient-helpline chatbot', 'Answers patients’ questions day and night.', 'limited', 1, ['VULNUSER', 'GROUND', 'PROMISE', 'DISCLOSE', 'UNTRUST', 'NODPIA']),
      P('H4', '📝', 'Clinical-notes summariser', 'Turns doctor–patient conversations into notes.', 'limited', 1, ['GROUND', 'NOCHECK', 'SHADOW', 'NODPIA', 'OSS', 'UNPATCHED']),
      P('H5', '📅', 'No-show predictor', 'Predicts who will miss appointments and double-books them.', 'minimal', 1, ['BIAS', 'AUTO', 'EXPLAIN', 'CONSENT', 'MONITOR', 'VENDOR']),
      P('H6', '😐', 'Emotion AI on hospital staff', 'Reads staff faces and voices to rate their stress and performance.', 'prohibited', 1, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'NODPIA', 'DISCLOSE'], 1)] },
    pub: { n: 'Public sector', i: '🏛️', org: 'a government agency', blurb: 'Benefits scoring, citizen advice, grading, visas', p: [
      P('G1', '⚖️', 'Benefits fraud-risk scoring', 'Picks which benefit claims to investigate for fraud.', 'high', 1, ['AUTO', 'BIAS', 'EXPLAIN', 'NODPIA', 'MONITOR', 'CONSENT']),
      P('G2', '🗽', 'Citizen-advice chatbot', 'Answers questions about rules, permits and rights.', 'limited', 0, ['GROUND', 'NOCHECK', 'PROMISE', 'DISCLOSE', 'UNTRUST', 'UNTEST']),
      P('G3', '🎓', 'Exam-grading algorithm', 'Sets students’ grades when exams can’t be held.', 'high', 1, ['BIAS', 'AUTO', 'EXPLAIN', 'UNTEST', 'MONITOR', 'NOCHECK']),
      P('G4', '🛂', 'Visa document checker', 'Checks visa applications and flags documents for refusal.', 'high', 1, ['AUTO', 'VENDOR', 'UNPATCHED', 'EXPLAIN', 'BIAS', 'NODPIA']),
      P('G5', '🌐', 'Public-service translation AI', 'Translates letters and web pages into 20 languages.', 'limited', 0, ['GROUND', 'NOCHECK', 'DISCLOSE', 'OSS', 'LICENSE', 'UNTEST']),
      P('G6', '🚓', 'Predictive policing of individuals', 'Rates each person’s chance of committing a crime from their profile alone.', 'prohibited', 1, ['BIAS', 'AUTO', 'EXPLAIN', 'CONSENT', 'NODPIA', 'VENDOR'], 1)] },
    hr: { n: 'HR and workplace', i: '👥', org: 'a large employer', blurb: 'CV screening, interview scoring, HR bots, coding agents', p: [
      P('R1', '📄', 'CV screening tool', 'Shortlists job applicants from their CVs.', 'high', 1, ['BIAS', 'AUTO', 'EXPLAIN', 'VENDOR', 'NODPIA', 'SHADOW']),
      P('R2', '🎥', 'Video-interview scoring', 'Scores candidates from recorded interviews.', 'high', 1, ['BIAS', 'EXPLAIN', 'CONSENT', 'VENDOR', 'AUTO', 'MONITOR']),
      P('R3', '💬', 'HR policy chatbot', 'Answers staff questions on leave, pay and policies.', 'limited', 1, ['GROUND', 'NOCHECK', 'PROMISE', 'UNTRUST', 'DISCLOSE', 'SHADOW']),
      P('R4', '👀', 'Staff productivity monitoring', 'Tracks activity and flags “low performers” to managers.', 'high', 1, ['CONSENT', 'NODPIA', 'AUTO', 'EXPLAIN', 'BIAS', 'DISCLOSE']),
      P('R5', '👩‍💻', 'Internal coding agent', 'Writes and deploys code with access to company systems.', 'minimal', 0, ['ACCESS', 'OSS', 'UNPATCHED', 'UNTRUST', 'SHADOW', 'UNTEST']),
      P('R6', '😐', 'Emotion AI in staff meetings', 'Reads faces in meetings to score engagement and mood.', 'prohibited', 1, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'NODPIA', 'DISCLOSE'], 1)] },
    retail: { n: 'Retail and e-commerce', i: '🛒', org: 'an online retailer', blurb: 'Dynamic pricing, shopping assistants, generated content', p: [
      P('T1', '🏷️', 'Dynamic pricing engine', 'Changes prices for each customer, every hour.', 'minimal', 1, ['MONITOR', 'BIAS', 'EXPLAIN', 'UNTEST', 'VENDOR', 'AUTO']),
      P('T2', '🛍️', 'Shopping-assistant chatbot', 'Helps customers choose products and can offer discounts.', 'limited', 1, ['PROMISE', 'UNTRUST', 'GROUND', 'LIVE', 'DISCLOSE', 'UNTEST']),
      P('T3', '🖼️', 'AI product images and copy', 'Generates product photos and descriptions at scale.', 'limited', 0, ['LICENSE', 'DISCLOSE', 'CONSENT', 'NOCHECK', 'OSS', 'SHADOW']),
      P('T4', '🧸', 'Children’s product recommender', 'Recommends toys and games to families.', 'limited', 1, ['VULNUSER', 'NODPIA', 'CONSENT', 'BIAS', 'MONITOR', 'LIVE']),
      P('T5', '🤝', 'Supplier-negotiation agent', 'Negotiates and agrees deals with suppliers by email.', 'minimal', 0, ['PROMISE', 'ACCESS', 'PAYV', 'UNTRUST', 'NOCHECK', 'VENDOR']),
      P('T6', '🎣', 'Manipulative “nudge” engine', 'Spots vulnerable shoppers and uses hidden tricks to push impulse buys.', 'prohibited', 1, ['VULNUSER', 'CONSENT', 'NODPIA', 'DISCLOSE', 'BIAS', 'AUTO'], 1)] },
    tel: { n: 'Telecom and energy', i: '📡', org: 'a telecom and energy group', blurb: 'Outage prediction, grid agents, smart-meter data', p: [
      P('E1', '⚡', 'Outage-prediction model', 'Predicts network and power outages before they happen.', 'minimal', 0, ['MONITOR', 'UNTEST', 'UNPATCHED', 'OSS', 'VENDOR', 'EXPLAIN']),
      P('E2', '📞', 'Customer-retention chatbot', 'Talks customers out of leaving, and can offer deals.', 'limited', 1, ['PROMISE', 'GROUND', 'UNTRUST', 'LIVE', 'DISCLOSE', 'NOCHECK']),
      P('E3', '🔌', 'Smart-meter analytics', 'Analyses home energy use to sell new tariffs.', 'limited', 1, ['NODPIA', 'CONSENT', 'VENDOR', 'UNPATCHED', 'MONITOR', 'SHADOW']),
      P('E4', '🏭', 'Grid-control agent', 'An AI agent that balances the grid in real time.', 'high', 0, ['ACCESS', 'UNPATCHED', 'OSS', 'UNTEST', 'MONITOR', 'PAYV']),
      P('E5', '🧾', 'Bill-dispute decision model', 'Decides whether to accept customers’ bill complaints.', 'limited', 1, ['AUTO', 'BIAS', 'EXPLAIN', 'NOCHECK', 'VENDOR', 'GROUND']),
      P('E6', '🗣️', 'Voice-based ethnicity sorting', 'Guesses callers’ ethnicity from their voice to route and price them.', 'prohibited', 1, ['BIAS', 'CONSENT', 'NODPIA', 'AUTO', 'EXPLAIN', 'DISCLOSE'], 1)] },
  };
  DOMAINS.mixed = { n: 'Mixed', i: '🎲', org: 'a large group', blurb: 'A bit of everything, for a general audience', p: [] };
  const DKEYS = ['bank', 'ins', 'health', 'pub', 'hr', 'retail', 'tel', 'mixed'];
  const ALLP = {}; DKEYS.forEach(k => DOMAINS[k].p.forEach(p => { ALLP[p.id] = Object.assign({ dom: k }, p); }));

  // projects for a game: always one trap (never first), the rest from the domain, topped up from other domains
  function pickProjects(dom, len, seed) {
    const own = dom === 'mixed' ? [] : DOMAINS[dom].p;
    const others = Object.values(ALLP).filter(p => p.dom !== dom && !p.trap);
    let traps = own.filter(p => p.trap); if (!traps.length) traps = shuffle(Object.values(ALLP).filter(p => p.trap).map(p => p.id), seed + 't').slice(0, 1).map(id => ALLP[id]);
    let rest = shuffle(own.filter(p => !p.trap).map(p => p.id), seed + 'r');
    if (rest.length < len - 1) rest = rest.concat(shuffle(others.map(p => p.id), seed + 'o').slice(0, len - 1 - rest.length));
    rest = rest.slice(0, len - 1);
    const pos = 1 + Math.floor(hash(seed + 'pos') * (len - 1));
    rest.splice(pos, 0, traps[0].id); return rest;
  }
  // two hidden weaknesses per player per project (deterministic, so no writes needed)
  function dealt(seed, pid, idx, projId) { const pool = ALLP[projId].w; return shuffle(pool, seed + ':' + pid + ':' + idx).slice(0, 2); }

  // three headlines per project: two about this kind of system (at least one hits someone), one from elsewhere
  function drawNews(seed, idx, projId, pids, used) {
    used = used || []; const pool = ALLP[projId].w;
    const hit = new Set(); (pids || []).forEach(pid => dealt(seed, pid, idx, projId).forEach(w => hit.add(w)));
    const ids = Object.keys(N), sc = id => hash(seed + ':n:' + idx + ':' + id) - (used.includes(id) ? 2 : 0);
    const on = ids.filter(id => pool.includes(N[id].w)).sort((a, b) => sc(b) - sc(a));
    const off = ids.filter(id => !pool.includes(N[id].w)).sort((a, b) => sc(b) - sc(a));
    const pick = on.slice(0, 2);
    if (hit.size && !pick.some(id => hit.has(N[id].w))) { const h = on.find(id => hit.has(N[id].w)); if (h) pick[1] = h; }
    while (pick.length < 2 && off.length) pick.push(off.shift());
    const noise = off.find(id => !pick.includes(id)); if (noise) pick.push(noise);
    return { h: shuffle(pick, seed + 'h' + idx) };
  }

  // ---------- scoring ----------
  // stage for project i: 0 = deciding, 1 = news shown, 2 = results shown
  function stageOf(state, i) { const cur = state.idx || 0; if (i < cur) return 2; if (i > cur) return -1;
    return { deal: 0, news: 1, res: 2, end: 2 }[state.phase] ?? -1; }

  function score(state, pid, pl) {
    pl = pl || {}; const seed = state.seed, projs = state.projects || [], START = budgetFor(state.len);
    let budget = START, year = 0, stars = 5; const out = { start: START, proj: [], launched: 0, paused: 0, hits: 0, quiet: 0, disclosed: 0 };
    for (let i = 0; i < projs.length; i++) {
      const st = stageOf(state, i); if (st < 0) break;
      const projId = projs[i], proj = ALLP[projId], pr = (pl.pr && pl.pr[i]) || {}, fx = pr.f || {}, d = pr.d || {};
      const my = dealt(seed, pid, i, projId), news = ((state.news || {})[i] || {}).h || [];
      const R = { i, projId, my, now: [], year: [], hits: [], size: null, paused: false, trap: proj.trap, starsBefore: stars, spent: 0, yearNet: 0 };
      const spend = (txt, v) => { budget -= v; R.spent += v; R.now.push({ txt, v: -v }); };
      const book = (txt, v) => { year += v; R.yearNet += v; R.year.push({ txt, v }); };
      // one control can fix both weaknesses; it is paid for once
      const ctl = [...new Set(my.filter(w => fx[w]).map(w => FIX[w]))], isFixed = w => ctl.includes(FIX[w]);
      ctl.forEach(k => spend(C[k].i + ' Fixed: ' + C[k].n.toLowerCase(), C[k].cost));
      const size = pr.s && pr.s !== 'pause' ? pr.s : null;
      if (size) { spend(SIZE[size].e + ' ' + SIZE[size].n + ' launch', SIZE[size].cost); out.launched++; }
      R.size = size; R.paused = !size && (pr.s === 'pause' || st >= 1); if (R.paused) out.paused++;
      if (st >= 1) news.forEach(nid => {
        const n = N[nid], v = { nid, kind: 'safe', dmg: 0 };
        if (my.includes(n.w)) {
          if (isFixed(n.w)) { v.kind = 'blocked'; v.by = C[FIX[n.w]]; }
          else if (!size) { v.kind = 'wouldHit'; v.would = SEV[n.sev].dmg * SIZE.big.mult; }
          else { v.kind = 'hit'; v.dmg = SEV[n.sev].dmg * SIZE[size].mult; v.resp = d[nid] || null; stars -= 1; out.hits++;
            book('⚠️ Damage: ' + W[n.w].toLowerCase(), -v.dmg);
            if (v.resp === 'disc') { const fromB = Math.min(DISCLOSE, Math.max(0, budget)); if (fromB) spend('📢 Disclosed the incident', fromB); if (DISCLOSE - fromB) book('📢 Disclosed the incident', -(DISCLOSE - fromB)); out.disclosed++; } }
        }
        R.hits.push(v);
      });
      if (st >= 2) {
        R.hits.filter(v => v.kind === 'hit' && v.resp !== 'disc').forEach(v => { out.quiet++;
          v.leaked = hash(seed + ':leak:' + pid + ':' + i + ':' + v.nid) < 0.5; if (v.leaked) { stars -= 2; R.leaked = (R.leaked || 0) + 1; } });
        stars = Math.max(0, stars);
        if (size && proj.trap) { book('🚫 Fined: banned under the EU AI Act', -TRAPFINE[size]); stars -= 1; R.fined = 1; }
        else if (size) { const s = Math.max(0, Math.min(5, stars)), rev = Math.round(SIZE[size].earn * s / 5 * 10) / 10; R.rev = rev; book('📈 Revenue €' + SIZE[size].earn + 'k × ' + s + '/5 ⭐', rev); }
        // one lesson
        const worst = R.hits.filter(v => v.dmg).sort((a, b) => b.dmg - a.dmg)[0];
        if (proj.trap) R.lesson = size ? '🚫 This system is banned under the EU AI Act. No fix makes it legal. Pause it.' : '🚫 Right call. This system is banned under the EU AI Act.';
        else if (worst) { const k = FIX[N[worst.nid].w]; R.lesson = C[k].i + ' ' + C[k].n + ' (€' + C[k].cost + 'k) would have saved you €' + worst.dmg + 'k and a star.'; }
        else if (!size && R.hits.some(v => v.kind === 'wouldHit')) R.lesson = '⏸️ Pausing kept you out of the news this time.';
        else if (!size) R.lesson = '⏸️ Nothing would have hit you. Pausing cost you the revenue.';
        else R.lesson = R.hits.some(v => v.kind === 'blocked') ? '🛡️ Your fix blocked a real incident. That money was well spent.' : '✅ No news hit you this time. Your fixes, or your luck, held.';
      }
      stars = Math.max(0, Math.min(5, stars)); R.starsAfter = stars;
      out.proj.push(R);
    }
    const r1 = v => Math.round(v * 10) / 10;
    out.budget = r1(budget); out.year = r1(year); out.total = r1(budget + year); out.stars = stars;
    return out;
  }

  const api = { hash, shuffle, PER, budgetFor, SIZE, ORDER, SEV, DISCLOSE, TRAPFINE, W, C, FIX, N, AREAS, TIER, DOMAINS, DKEYS, ALLP,
    pickProjects, dealt, drawNews, stageOf, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DeltaGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
