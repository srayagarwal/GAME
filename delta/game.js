/* DELTA · Responsible AI Leadership Simulation. Pure data + scoring: works in the browser (window.DeltaGame) and in Node (tests). */
(function (root) {
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 2246822507); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const shuffle = (arr, seed) => arr.map((x, i) => [hash(seed + ':' + i + ':' + x), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  // ---------- rules ----------
  const MULT = t => Math.round((0.4 + 0.12 * t) * 100) / 100;
  const BUDGET = [30, 45, 30, 45], START = BUDGET[0], PEOPLE = 3, ASSESS = { m: 5, p: 1 }, DISCLOSE = 10, BANFINE = 60;
  const SEV = { minor: { n: 'Minor', dmg: 15 }, major: { n: 'Major', dmg: 30 }, critical: { n: 'Critical', dmg: 45 } };
  const TIER = { prohibited: '🚫 Prohibited', high: '⚠️ High risk', limited: 'ℹ️ Limited risk', minimal: '✅ Minimal risk' };

  // ---------- risks (hidden inside products) ----------
  const W = {
    GROUND: 'Answers not based on company policy', NOCHECK: 'Nobody checks its output', AUTO: 'Decisions about people are fully automated',
    UNTEST: 'Not tested before launch', PROMISE: 'No limits on what it says or promises', UNTRUST: 'Reads untrusted emails and documents',
    LIVE: 'Learns live from users', VENDOR: 'Built by a vendor nobody checked', SHADOW: 'Staff use public AI tools',
    NODPIA: 'Uses personal data, no privacy assessment', CONSENT: 'Data collected without consent', LICENSE: 'Training data not licensed',
    BIAS: 'Trained on biased past decisions', EXPLAIN: "Can't explain its decisions", ACCESS: 'Agent has broad access and no off switch',
    VULNUSER: 'Vulnerable users, no safety checks', PAYV: 'Payments approved by voice or video', MONITOR: 'Nobody monitors the model',
    DISCLOSE: 'AI use not disclosed to people', DATAMIN: 'Collects more personal data than it needs', FAKECONTENT: 'AI content passed off as real', OSS: 'Uses open-source models without checking them', UNPATCHED: 'AI servers exposed to the internet, not patched',
  };
  const AREAS = { hal: '🤥 Hallucination & quality', sec: '🔓 Security', pri: '🔐 Privacy & data', fair: '⚖️ Fairness & explainability', safe: '🦺 Safety & oversight', fake: '🎭 Fraud & deepfakes', ops: '🏷️ Transparency, IP & suppliers', act: '🇪🇺 EU AI Act · high-risk duties' };
  const WAREA = { GROUND: 'hal', NOCHECK: 'safe', AUTO: 'safe', UNTEST: 'hal', PROMISE: 'sec', UNTRUST: 'sec', LIVE: 'sec', VENDOR: 'ops', SHADOW: 'sec', NODPIA: 'pri', CONSENT: 'pri', LICENSE: 'pri', BIAS: 'fair', EXPLAIN: 'fair', ACCESS: 'sec', VULNUSER: 'safe', PAYV: 'fake', MONITOR: 'hal', DISCLOSE: 'ops', OSS: 'sec', UNPATCHED: 'sec', DATAMIN: 'pri', FAKECONTENT: 'fake' };

  // ---------- 19 controls (protect one product) ----------
  // sec: security control that only works 75% without red teaming
  const C = {
    GRND: { a: 'hal', n: 'Grounding', i: '📚', m: 8, p: 0, fix: ['GROUND'], d: 'Answers only from approved sources, with citations' },
    TEST: { a: 'hal', n: 'Testing & evaluations', i: '🧪', m: 8, p: 0, fix: ['UNTEST'], d: 'Accuracy, robustness and hallucination tests before launch' },
    DRIFT: { a: 'hal', n: 'Drift monitoring', i: '📈', m: 15, p: 0, fix: ['MONITOR'], d: 'Alerts when the model starts going wrong in production' },
    GUARD: { a: 'sec', n: 'Guardrails', i: '🚧', m: 5, p: 0, fix: ['PROMISE'], sec: 1, d: 'Limits what it can say, do or promise · 75% without red teaming' },
    RT: { a: 'sec', n: 'Red teaming', i: '🎯', m: 20, p: 1, fix: ['UNTRUST', 'LIVE'], d: 'Experts attack it before launch · makes this product’s security controls work 100%' },
    LPK: { a: 'sec', n: 'Least privilege + kill switch', i: '🔑', m: 8, p: 0, fix: ['ACCESS'], sec: 1, d: 'An agent gets only the access it needs, and can be stopped instantly' },
    VULN: { a: 'sec', n: 'Vulnerability detection', i: '🔍', m: 15, p: 0, fix: ['OSS', 'UNPATCHED'], sec: 1, d: 'Scans models, libraries and servers for known flaws' },
    TOOL: { a: 'sec', n: 'Approved AI tool + leak blocking', i: '🧰', m: 8, p: 0, fix: ['SHADOW'], d: 'Staff get a safe AI tool instead of public chatbots' },
    DPR: { a: 'pri', n: 'Data protection review', i: '🔐', m: 25, p: 1, fix: ['NODPIA', 'CONSENT', 'LICENSE', 'DATAMIN'], d: 'DPIA, lawful basis and consent, data licensing, data minimisation (GDPR)' },
    BIAS: { a: 'fair', n: 'Bias testing', i: '⚖️', m: 12, p: 0, fix: ['BIAS'], d: 'Test outcomes across groups before launch' },
    XAI: { a: 'fair', n: 'Explainability', i: '💡', m: 8, p: 0, fix: ['EXPLAIN'], d: 'Every decision comes with a reason people can understand' },
    HITL: { a: 'safe', n: 'Human in the loop', i: '🧑‍⚖️', m: 18, p: 1, fix: ['NOCHECK', 'AUTO'], d: 'A person reviews outputs and decisions · EU AI Act Art. 14 · −10% revenue' },
    SAFE: { a: 'safe', n: 'Safety testing + human handover', i: '🦺', m: 18, p: 1, fix: ['VULNUSER'], d: 'Tested with vulnerable users in mind; hands over to a person when needed' },
    CALL: { a: 'fake', n: 'Call-back check', i: '📞', m: 5, p: 0, fix: ['PAYV'], d: 'Every payment request confirmed on a known number' },
    WMARK: { a: 'fake', n: 'Content watermarking', i: '🖼️', m: 5, p: 0, fix: ['FAKECONTENT'], d: 'AI-generated images, audio and video are labelled · EU AI Act Art. 50' },
    TRANS: { a: 'ops', n: 'Transparency notice', i: '🏷️', m: 5, p: 0, fix: ['DISCLOSE'], d: 'People are told when they are dealing with AI · EU AI Act Art. 50' },
    VEND: { a: 'ops', n: 'Vendor due diligence', i: '🤝', m: 8, p: 1, fix: ['VENDOR'], d: 'Check the supplier, the model and the contract before you sign' },
    DOCS: { a: 'act', n: 'Technical documentation & logging', i: '📑', m: 10, p: 1, fix: [], d: 'Annex IV documentation, automatic logs, instructions for deployers, accuracy records · Arts 11–13, 15' },
    CONF: { a: 'act', n: 'Conformity assessment & FRIA', i: '✅', m: 18, p: 1, fix: [], d: 'Risk management system, conformity assessment, CE marking, EU database, fundamental rights impact assessment · Arts 9, 27, 43, 48–49' },
  };
  const FIXOF = {}; Object.keys(W).forEach(w => { FIXOF[w] = Object.keys(C).filter(k => C[k].fix.includes(w)); });

  // ---------- 11 governance foundations (protect every product) ----------
  const F = {
    GOV: { n: 'AI governance framework', i: '🏛️', m: 24, p: 1, d: 'Every product’s EU AI Act tier is shown without an assessment · counts in EU AI Act inspections' },
    INV: { n: 'AI inventory + named owner', i: '📋', m: 8, p: 1, d: 'Passes “Board asks: what AI do we run?” · counts in EU AI Act inspections' },
    POL: { n: 'AI policy & acceptable use', i: '📜', m: 8, p: 0, d: 'Halves the damage from shadow AI everywhere' },
    IRP: { n: 'Incident response plan', i: '🚨', m: 8, p: 1, d: 'Disclosing is free · whistleblowers can’t hurt you · insurers reward you' },
    LIT: { n: 'AI literacy programme', i: '🎓', m: 15, p: 1, fix: ['PAYV'], d: 'Staff spot deepfakes and misuse: closes deepfake-payment risk everywhere · EU AI Act Art. 4' },
    ETH: { n: 'AI ethics & risk committee', i: '⚖️', m: 18, p: 1, d: 'Flags banned (prohibited) systems before you build them' },
    VSCAN: { n: 'Vulnerability scanning platform', i: '🔍', m: 15, p: 0, fix: ['OSS', 'UNPATCHED'], d: 'Closes open-source and unpatched-server risks everywhere' },
    RTC: { n: 'Red-team capability', i: '🎯', m: 24, p: 1, d: 'Security controls work 100% on every product' },
    MON: { n: 'Continuous monitoring', i: '📈', m: 18, p: 0, fix: ['MONITOR'], d: 'Closes the “nobody monitors the model” risk everywhere' },
    ETOOL: { n: 'Enterprise AI tool', i: '🧰', m: 15, p: 0, fix: ['SHADOW'], d: 'Closes shadow-AI risk everywhere' },
    INS: { n: 'AI liability insurance', i: '🛡️', m: 20, p: 0, need: ['IRP', 'INV'], d: 'Pays your single biggest damage once · needs an incident response plan and an AI inventory first' },
  };

  // ---------- real incidents ----------
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
    HM: { a: 'pri', w: 'DATAMIN', sev: 'major', src: 'PRIVACY WATCH', h: 'Retailer fined €35m for hoarding staff’s private-life details', s: 'Holidays, illnesses, family problems: all logged.',
      r: 'In 2020 Hamburg’s data protection authority fined H&M €35.3m for collecting and storing excessive details about employees’ private lives, including health and family issues.' },
    PENTAGON: { a: 'fake', w: 'FAKECONTENT', sev: 'major', src: 'MARKET WIRE', h: 'Fake AI image of an explosion briefly knocks the stock market', s: 'It spread faster than anyone could check it.',
      r: 'In May 2023 an AI-generated image of an explosion near the Pentagon spread on social media from verified-looking accounts. US stocks dipped briefly before officials confirmed it was fake.' },
  };
  // ---------- regulator and stakeholder events ----------
  const EV = {
    INSPECT: { i: '🇪🇺', n: 'EU AI Act inspection', d: 'Every live high-risk system is checked for 5 things: human in the loop, technical documentation & logging, conformity assessment & FRIA, an AI governance framework and an AI inventory. −€10k for each one missing.' },
    PROHIB: { i: '🚫', n: 'Prohibited-practice enforcement', d: 'A banned AI system is live. The authority shuts it down: −€60k and −2 ⭐. (This happens automatically whenever a prohibited system goes live.)' },
    DPA: { i: '🔐', n: 'Data protection authority audit', d: 'Live systems with an open data-protection risk (no DPIA, no consent, unlicensed data, excessive data): −€30k each.' },
    JOURNAL: { i: '🔎', n: 'Journalist tests your AI for bias', d: 'Live systems with an open bias risk make the news: −1 ⭐ each.' },
    WHISTLE: { i: '📣', n: 'Whistleblower contacts the press', d: 'Every incident you kept quiet this quarter leaks: −2 ⭐ each. An incident response plan protects you.' },
    BOARD: { i: '📋', n: 'Board asks: what AI do we run?', d: 'No AI inventory with named owners: −1 ⭐.' },
    EXPLAIN: { i: '🙋', n: 'Customers demand an explanation', d: 'Live systems that can’t explain their decisions face complaints: −€15k each.' },
    INSURER: { i: '🛡️', n: 'Insurer renewal', d: 'No incident response plan: premiums rise, −€10k.' },
    QUIET: { i: '🌤️', n: 'Quiet quarter', d: 'No regulator, no press. Good governance often looks like this.' },
  };

  // ---------- 7 sectors × 4 products ----------
  const P = (id, i, n, d, tier, build, earn, w) => ({ id, i, n, d, tier, build, earn, w });
  const SECTORS = {
    bank: { n: 'Banking', i: '🏦', org: 'a bank', blurb: 'Credit scoring, dispute chatbots, payment agents', p: [
      P('B1', '💳', 'Credit-scoring model', 'Decides who gets a personal loan, and at what rate.', 'high', 30, 60, ['BIAS', 'EXPLAIN', 'AUTO', 'NODPIA', 'MONITOR', 'VENDOR']),
      P('B2', '💬', 'Card-dispute chatbot', 'Customers dispute card payments and ask for refunds by chat.', 'limited', 20, 40, ['GROUND', 'PROMISE', 'UNTRUST', 'NOCHECK', 'DISCLOSE', 'UNTEST']),
      P('B3', '🤖', 'Supplier-payment agent', 'An AI agent that reads invoices and pays suppliers.', 'minimal', 25, 45, ['PAYV', 'ACCESS', 'UNTRUST', 'VENDOR', 'UNPATCHED', 'NOCHECK']),
      P('B4', '🕵️', 'Customer “trustworthiness” score', 'Rates customers from their social media and spending, and limits services for low scores.', 'prohibited', 25, 80, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'DATAMIN', 'VENDOR'])] },
    ins: { n: 'Insurance', i: '🛡️', org: 'an insurer', blurb: 'Pricing models, claims bots, drone assessment', p: [
      P('I1', '🧮', 'Life & health pricing model', 'Sets life and health insurance premiums for each customer.', 'high', 30, 60, ['BIAS', 'EXPLAIN', 'NODPIA', 'MONITOR', 'CONSENT', 'AUTO']),
      P('I2', '💬', 'Claims chatbot', 'Customers file claims by chat, and it can approve small payouts.', 'limited', 20, 40, ['PROMISE', 'GROUND', 'UNTRUST', 'PAYV', 'DISCLOSE', 'UNTEST']),
      P('I3', '🛸', 'Drone damage assessment', 'Estimates home-claim damage from drone photos.', 'minimal', 20, 35, ['MONITOR', 'UNTEST', 'EXPLAIN', 'VENDOR', 'UNPATCHED', 'OSS']),
      P('I4', '😐', 'Emotion AI on claims handlers', 'Watches staff faces on calls to rate their honesty and stress.', 'prohibited', 25, 70, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'DATAMIN', 'DISCLOSE'])] },
    health: { n: 'Healthcare', i: '🏥', org: 'a hospital group', blurb: 'Triage, patient helplines, scheduling', p: [
      P('H1', '🚑', 'A&E triage assistant', 'Suggests how urgently each patient should be seen.', 'high', 30, 60, ['VULNUSER', 'NOCHECK', 'BIAS', 'MONITOR', 'UNTEST', 'GROUND']),
      P('H2', '💬', 'Patient-helpline chatbot', 'Answers patients’ questions day and night.', 'limited', 20, 40, ['VULNUSER', 'GROUND', 'PROMISE', 'DISCLOSE', 'UNTRUST', 'NODPIA']),
      P('H3', '📅', 'No-show predictor', 'Predicts who will miss appointments and double-books them.', 'minimal', 15, 35, ['BIAS', 'AUTO', 'EXPLAIN', 'CONSENT', 'MONITOR', 'DATAMIN']),
      P('H4', '😐', 'Emotion AI on hospital staff', 'Reads staff faces and voices to rate their stress and performance.', 'prohibited', 25, 70, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'DATAMIN', 'DISCLOSE'])] },
    pub: { n: 'Public sector', i: '🏛️', org: 'a government agency', blurb: 'Benefits scoring, citizen advice, exam grading', p: [
      P('G1', '⚖️', 'Benefits fraud-risk scoring', 'Picks which benefit claims to investigate for fraud.', 'high', 30, 60, ['AUTO', 'BIAS', 'EXPLAIN', 'NODPIA', 'MONITOR', 'CONSENT']),
      P('G2', '🗽', 'Citizen-advice chatbot', 'Answers questions about rules, permits and rights.', 'limited', 20, 40, ['GROUND', 'NOCHECK', 'PROMISE', 'DISCLOSE', 'UNTRUST', 'UNTEST']),
      P('G3', '🎓', 'Exam-grading algorithm', 'Sets students’ grades when exams can’t be held.', 'high', 25, 50, ['BIAS', 'AUTO', 'EXPLAIN', 'UNTEST', 'MONITOR', 'NOCHECK']),
      P('G4', '🚓', 'Predictive policing of individuals', 'Rates each person’s chance of committing a crime from their profile alone.', 'prohibited', 25, 70, ['BIAS', 'AUTO', 'EXPLAIN', 'CONSENT', 'DATAMIN', 'VENDOR'])] },
    hr: { n: 'HR and workplace', i: '👥', org: 'a large employer', blurb: 'CV screening, HR chatbots, coding agents', p: [
      P('R1', '📄', 'CV screening tool', 'Shortlists job applicants from their CVs.', 'high', 25, 55, ['BIAS', 'AUTO', 'EXPLAIN', 'VENDOR', 'NODPIA', 'SHADOW']),
      P('R2', '💬', 'HR policy chatbot', 'Answers staff questions on leave, pay and policies.', 'limited', 15, 35, ['GROUND', 'NOCHECK', 'PROMISE', 'UNTRUST', 'DISCLOSE', 'SHADOW']),
      P('R3', '👩‍💻', 'Internal coding agent', 'Writes and deploys code with access to company systems.', 'minimal', 25, 50, ['ACCESS', 'OSS', 'UNPATCHED', 'UNTRUST', 'SHADOW', 'UNTEST']),
      P('R4', '😐', 'Emotion AI in staff meetings', 'Reads faces in meetings to score engagement and mood.', 'prohibited', 25, 70, ['CONSENT', 'BIAS', 'AUTO', 'EXPLAIN', 'DATAMIN', 'DISCLOSE'])] },
    retail: { n: 'Retail and e-commerce', i: '🛒', org: 'an online retailer', blurb: 'Pricing, shopping assistants, generated content', p: [
      P('T1', '🏷️', 'Dynamic pricing engine', 'Changes prices for each customer, every hour.', 'minimal', 25, 50, ['MONITOR', 'BIAS', 'EXPLAIN', 'UNTEST', 'VENDOR', 'DATAMIN']),
      P('T2', '🛍️', 'Shopping-assistant chatbot', 'Helps customers choose products and can offer discounts.', 'limited', 20, 45, ['PROMISE', 'UNTRUST', 'GROUND', 'LIVE', 'DISCLOSE', 'UNTEST']),
      P('T3', '🖼️', 'AI product images and copy', 'Generates product photos, videos and descriptions at scale.', 'limited', 15, 35, ['LICENSE', 'FAKECONTENT', 'CONSENT', 'NOCHECK', 'OSS', 'SHADOW']),
      P('T4', '🎣', 'Manipulative “nudge” engine', 'Spots vulnerable shoppers and uses hidden tricks to push impulse buys.', 'prohibited', 25, 80, ['VULNUSER', 'CONSENT', 'DATAMIN', 'DISCLOSE', 'BIAS', 'AUTO'])] },
    tel: { n: 'Telecom and energy', i: '📡', org: 'a telecom and energy group', blurb: 'Grid agents, retention bots, outage prediction', p: [
      P('E1', '🏭', 'Grid-control agent', 'An AI agent that balances the power grid in real time.', 'high', 30, 60, ['ACCESS', 'UNPATCHED', 'OSS', 'UNTEST', 'MONITOR', 'PAYV']),
      P('E2', '📞', 'Customer-retention chatbot', 'Talks customers out of leaving, and can offer deals.', 'limited', 20, 40, ['PROMISE', 'GROUND', 'UNTRUST', 'LIVE', 'DISCLOSE', 'FAKECONTENT']),
      P('E3', '⚡', 'Outage-prediction model', 'Predicts network and power outages before they happen.', 'minimal', 20, 40, ['MONITOR', 'UNTEST', 'UNPATCHED', 'OSS', 'VENDOR', 'EXPLAIN']),
      P('E4', '🗣️', 'Voice-based ethnicity sorting', 'Guesses callers’ ethnicity from their voice to route and price them.', 'prohibited', 25, 70, ['BIAS', 'CONSENT', 'DATAMIN', 'AUTO', 'EXPLAIN', 'DISCLOSE'])] },
  };
  const SKEYS = ['bank', 'ins', 'health', 'pub', 'hr', 'retail', 'tel', 'mixed'];
  const ALLP = {}; Object.keys(SECTORS).forEach(k => SECTORS[k].p.forEach(p => { ALLP[p.id] = Object.assign({ sec: k }, p); }));
  SECTORS.mixed = { n: 'Mixed', i: '🎲', org: 'a large group', blurb: 'One product from each tier, from any sector', p: [] };

  // the 4 products in this game: the sector's own, or for "mixed" one of each tier from different sectors
  function productsFor(sector, seed) {
    if (sector !== 'mixed') return SECTORS[sector].p.map(p => p.id);
    const all = Object.values(ALLP), out = [], used = new Set();
    ['high', 'limited', 'minimal', 'prohibited'].forEach(t => { const pick = shuffle(all.filter(p => p.tier === t && !used.has(p.sec)).map(p => p.id), seed + t)[0]; out.push(pick); used.add(ALLP[pick].sec); });
    return out;
  }
  // three hidden risks per product; the same for everyone in the room so the debrief works
  const risksOf = (seed, pid) => shuffle(ALLP[pid].w, seed + ':r:' + pid).slice(0, 3);

  // ---------- scoring ----------
  // stage for quarter q: 0 = planning, 1 = events shown, 2 = report shown
  function stageOf(state, q) { const cur = state.q || 0; if (q < cur) return 2; if (q > cur) return -1; return { plan: 0, ev: 1, rep: 2, end: 2 }[state.phase] ?? -1; }
  const has = (map, k, q) => map && map[k] != null && map[k] <= q;

  function score(state, pid, pl) {
    pl = pl || {}; const seed = state.seed, Q = 4, prods = state.products || [], fnd = pl.f || {}, my = pl.p || {}, resp = pl.r || {};
    let cash = 0, trust = 5, insUsed = false;
    const out = { quarters: [], prod: {}, hits: 0, disclosed: 0, quiet: 0, pulled: 0, leaks: 0, banned: 0, m: {} };
    const P = {}; prods.forEach(id => { const x = my[id] || {}; P[id] = { id, risks: risksOf(seed, id), s: x.s, a: x.a, l: x.l, x: x.x, c: x.c || {}, closedBy: {}, fined: false }; });
    const live = (p, q) => p.l != null && p.l <= q && !(p.x != null && p.x < q);
    const closeInfo = (p, w, q) => { // full / partial / none
      for (const k of Object.keys(F)) if (F[k].fix && F[k].fix.includes(w) && has(fnd, k, q)) return { kind: 'full', by: F[k] };
      for (const k of FIXOF[w]) if (has(p.c, k, q)) { const c = C[k]; if (c.sec && !has(p.c, 'RT', q) && !has(fnd, 'RTC', q)) return { kind: 'partial', by: c }; return { kind: 'full', by: c }; }
      return { kind: 'none' };
    };
    for (let q = 0; q < Q; q++) {
      const st = stageOf(state, q); if (st < 0) break;
      const R = { q, lines: [], hits: [], reg: null, peopleUsed: 0, trustBefore: trust, notes: [] };
      const add = (t, v, k) => { v = Math.round(v * 10) / 10; if (v) R.lines.push({ t, v, k }); cash = Math.round((cash + v) * 10) / 10; };
      // 0 · budget released for this quarter, plus a bonus when last quarter went well
      add('💶 Quarter ' + (q + 1) + ' budget released', BUDGET[q] != null ? BUDGET[q] : 30, 'bud');
      if (q > 0) { const pq = out.quarters[q - 1], ids = prods.filter(id => P[id].l != null && P[id].l < q && ALLP[id].tier !== 'prohibited');
        if (q === 1 && pq.trustAfter >= 4 && !pq.hits.some(v => v.kind === 'hit') && prods.some(id => ALLP[id].tier !== 'prohibited' && P[id].a === 0) && !prods.some(id => ALLP[id].tier === 'prohibited' && P[id].s != null)) add('🎁 Bonus: Q1 assessed a product, kept 4+ ⭐ and had no incident', 20, 'bonus');
        if (q === 2 && ids.length && ids.every(id => P[id].a != null && P[id].a <= P[id].l && Object.keys(P[id].c).length) && !prods.some(id => ALLP[id].tier === 'prohibited' && P[id].l != null)) add('🎁 Bonus: every launch was assessed first and has controls', 25, 'bonus');
        if (q === 3 && pq.trustAfter >= 4 && ids.length && has(fnd, 'IRP', q) && has(fnd, 'INV', q)) add('🎁 Bonus: 4+ ⭐ held, with an incident plan and AI inventory', 30, 'bonus'); }
      // 1 · income from products live before this quarter
      if (q > 0) prods.forEach(id => { const p = P[id]; if (live(p, q - 1) && !(p.x != null && p.x <= q - 1)) { let r = ALLP[id].earn * MULT(trust); if (has(p.c, 'HITL', q - 1)) r *= 0.9; r = Math.round(r * 10) / 10; if (r) add(ALLP[id].i + ' ' + ALLP[id].n + ' earned (' + Math.round(MULT(trust) * 100) + '% at ' + trust + ' ⭐' + (has(p.c, 'HITL', q - 1) ? ', −10% human review' : '') + ')', r, 'inc'); } });
      // 2 · planning spend
      prods.forEach(id => { const p = P[id], A = ALLP[id];
        if (p.s === q) add('💡 Started: ' + A.n, -A.build, 'build');
        if (p.a === q) { add('🔍 Assessed: ' + A.n, -ASSESS.m, 'assess'); R.peopleUsed += ASSESS.p; }
        Object.keys(p.c).forEach(k => { if (p.c[k] === q) { add(C[k].i + ' ' + C[k].n + ' on ' + A.n, -C[k].m, 'ctl'); R.peopleUsed += C[k].p; } });
      });
      Object.keys(fnd).forEach(k => { if (fnd[k] === q && F[k]) { add(F[k].i + ' Built: ' + F[k].n, -F[k].m, 'fnd'); R.peopleUsed += F[k].p; } });
      // 3 · events
      const ev = (state.ev || {})[q] || {};
      if (st >= 1) {
        const n = ev.inc && N[ev.inc];
        prods.forEach(id => { const p = P[id], A = ALLP[id];
          // a banned system that goes live is always shut down
          if (A.tier === 'prohibited' && live(p, q) && !p.fined) { p.fined = true; p.x = q; out.banned++; add('🚫 Banned system shut down: ' + A.n, -BANFINE, 'ban'); trust -= 2; R.notes.push({ ban: id }); }
          if (!n) return;
          if (p.x != null && (p.x < q || (A.tier === 'prohibited' && p.fined && p.x === q))) return; // already pulled or shut down
          const v = { prod: id, nid: ev.inc, kind: 'safe', dmg: 0 };
          if (p.risks.includes(n.w)) {
            const ci = closeInfo(p, n.w, q);
            if (!live(p, q) || p.fined && p.x === q && A.tier === 'prohibited') v.kind = p.s != null && p.s <= q ? 'notlive' : 'safe';
            else if (ci.kind === 'full') { v.kind = 'blocked'; v.by = ci.by; }
            else { let dmg = SEV[n.sev].dmg; if (n.w === 'SHADOW' && has(fnd, 'POL', q)) dmg /= 2;
              if (ci.kind === 'partial') { v.kind = 'partial'; v.by = ci.by; v.dmg = dmg * 0.25; add('🛡️ Partly blocked (no red teaming): ' + A.n, -v.dmg, 'hit'); }
              else { v.kind = 'hit'; v.dmg = dmg; trust -= 1; out.hits++; add('⚠️ ' + n.h.slice(0, 48) + '… hit ' + A.n, -dmg, 'hit');
                v.resp = (resp[q] || {})[id] || null;
                if (v.resp === 'disc') { out.disclosed++; if (!has(fnd, 'IRP', q)) add('📢 Disclosed and fixed', -DISCLOSE, 'disc'); }
                if (v.resp === 'pull') { out.pulled++; p.x = q; } } }
          } else if (p.s != null && p.s <= q) v.kind = 'safe'; else return;
          R.hits.push(v);
        });
        // regulator event
        const rid = ev.reg; if (rid && EV[rid]) { const reg = { id: rid, lines: [], check: [] }; R.reg = reg;
          const lp = prods.filter(id => live(P[id], q));
          const openRisk = (id, ws) => P[id].risks.filter(w => ws.includes(w) && closeInfo(P[id], w, q).kind !== 'full');
          if (rid === 'INSPECT') lp.filter(id => ALLP[id].tier === 'high').forEach(id => { const p = P[id];
            const chk = [['🧑‍⚖️ Human in the loop (Art. 14)', has(p.c, 'HITL', q)], ['📑 Technical documentation & logging', has(p.c, 'DOCS', q)], ['✅ Conformity assessment & FRIA', has(p.c, 'CONF', q)], ['🏛️ AI governance framework', has(fnd, 'GOV', q)], ['📋 AI inventory + named owner', has(fnd, 'INV', q)]];
            const miss = chk.filter(c => !c[1]).length; reg.check.push({ prod: id, chk }); if (miss) add('🇪🇺 EU AI Act inspection · ' + ALLP[id].n + ': ' + miss + ' of 5 missing', -10 * miss, 'reg'); });
          if (rid === 'DPA') lp.forEach(id => { if (openRisk(id, ['NODPIA', 'CONSENT', 'LICENSE', 'DATAMIN']).length) add('🔐 Data protection audit · ' + ALLP[id].n, -30, 'reg'); });
          if (rid === 'JOURNAL') lp.forEach(id => { if (openRisk(id, ['BIAS']).length) { trust -= 1; reg.lines.push('🔎 Bias exposed in ' + ALLP[id].n + ': −1 ⭐'); } });
          if (rid === 'EXPLAIN') lp.forEach(id => { if (openRisk(id, ['EXPLAIN']).length) add('🙋 Complaints: ' + ALLP[id].n + ' can’t explain decisions', -15, 'reg'); });
          if (rid === 'BOARD' && !has(fnd, 'INV', q)) { trust -= 1; reg.lines.push('📋 You couldn’t tell the board what AI you run: −1 ⭐'); }
          if (rid === 'INSURER' && !has(fnd, 'IRP', q)) add('🛡️ Insurer renewal: no incident plan', -10, 'reg');
        }
      }
      // 4 · report: quiet incidents may leak; insurance pays out
      if (st >= 2) {
        R.hits.filter(v => v.kind === 'hit' && v.resp !== 'disc' && v.resp !== 'pull').forEach(v => { out.quiet++;
          v.leaked = ev.reg === 'WHISTLE' ? !has(fnd, 'IRP', q) : hash(seed + ':leak:' + pid + ':' + q + ':' + v.prod) < 0.5;
          if (v.leaked) { trust -= ev.reg === 'WHISTLE' ? 2 : 1; out.leaks++; R.notes.push({ leak: v.prod }); } });
        if (!insUsed && has(fnd, 'INS', q)) { const big = R.lines.filter(l => l.v < 0 && (l.k === 'hit' || l.k === 'reg' || l.k === 'ban')).sort((a, b) => a.v - b.v)[0];
          if (big) { insUsed = true; add('🛡️ Insurance pays your biggest hit', -big.v, 'ins'); } }
      }
      trust = Math.max(0, Math.min(5, trust)); R.trustAfter = trust; R.cash = cash;
      out.quarters.push(R);
    }
    // product summary + portfolio value
    let value = 0;
    prods.forEach(id => { const p = P[id], lastQ = Math.min((state.q || 0), Q - 1), isLive = live(p, lastQ) && !(p.x != null && p.x <= lastQ && stageOf(state, lastQ) >= 1 && p.x === lastQ && false);
      const nowLive = p.l != null && !(p.x != null);
      out.prod[id] = { id, started: p.s != null, assessed: p.a != null, live: nowLive, pulled: p.x != null, risks: p.risks, c: p.c, s: p.s, a: p.a, l: p.l, x: p.x };
      if (nowLive) value += ALLP[id].earn * 2 * MULT(trust); });
    out.cash = Math.round(cash * 10) / 10; out.trust = trust; out.value = Math.round(value * 10) / 10; out.total = Math.round((cash + value) * 10) / 10;
    // ---- RAI capability metrics ----
    const launched = prods.filter(id => P[id].l != null), m = out.m;
    m.gov = Object.keys(fnd).filter(k => F[k]).length;
    m.assessN = launched.filter(id => ALLP[id].tier !== 'prohibited').length; m.assessOK = launched.filter(id => ALLP[id].tier !== 'prohibited' && P[id].a != null && P[id].a <= P[id].l).length;
    let cN = 0, cOK = 0; prods.forEach(id => Object.keys(P[id].c).forEach(k => { if (k === 'DOCS' || k === 'CONF') { cN++; if (ALLP[id].tier === 'high') cOK++; return; } cN++; if (C[k].fix.some(w => P[id].risks.includes(w))) cOK++; }));
    m.ctlN = cN; m.ctlOK = cOK;
    let aN = 0, aOK = 0; launched.forEach(id => { const p = P[id], t = ALLP[id].tier;
      if (t === 'high') { const it = [has(p.c, 'HITL', Q), has(p.c, 'DOCS', Q), has(p.c, 'CONF', Q), has(fnd, 'GOV', Q), has(fnd, 'INV', Q)]; aN += 5; aOK += it.filter(Boolean).length; }
      if (t === 'limited' && p.risks.includes('DISCLOSE') || t === 'limited') { aN += 1; if (has(p.c, 'TRANS', Q)) aOK += 1; } });
    m.actN = aN; m.actOK = aOK;
    m.irN = out.hits; m.irOK = out.disclosed + out.pulled;
    m.banned = launched.some(id => ALLP[id].tier === 'prohibited') ? 0 : 1;
    m.refused = prods.some(id => ALLP[id].tier === 'prohibited' && P[id].s == null) ? 1 : 0;
    return out;
  }

  // people used and budget for the current quarter (for the planning screen)
  function planInfo(state, pid, pl) { const r = score(state, pid, pl), q = state.q || 0, R = r.quarters[q] || { peopleUsed: 0 }; return { cash: r.cash, peopleLeft: PEOPLE - R.peopleUsed, trust: r.trust, r }; }

  // ---------- the host draws this quarter's incident and regulator event ----------
  function drawEvents(state, players) {
    const q = state.q || 0, seed = state.seed, used = Object.values(state.ev || {}).map(e => e.inc), usedReg = Object.values(state.ev || {}).map(e => e.reg).filter(Boolean);
    const usedAreas = new Set(used.map(id => N[id] && N[id].a));
    const plist = Object.entries(players || {}).filter(([, p]) => p && p.name);
    const prods = state.products || [];
    // what is live (or started) across the room, and which risks are still open
    const openCount = w => { let n = 0; plist.forEach(([id, pl]) => prods.forEach(pr => { const x = ((pl.p || {})[pr]) || {}; if (x.l != null && x.x == null && risksOf(seed, pr).includes(w)) { const cs = x.c || {}; if (!FIXOF[w].some(k => cs[k] != null)) n++; } })); return n; };
    const anyStarted = w => plist.some(([, pl]) => prods.some(pr => ((pl.p || {})[pr] || {}).s != null && risksOf(seed, pr).includes(w)));
    const cand = Object.keys(N).filter(id => !used.includes(id)).map(id => { const w = N[id].w, o = openCount(w);
      return [id, o * 2 + (anyStarted(w) ? 1.5 : 0) + (prods.some(pr => risksOf(seed, pr).includes(w)) ? 1 : 0) + (usedAreas.has(N[id].a) ? 0 : 1.2) + hash(seed + ':i:' + q + id) * 1.5]; })
      .sort((a, b) => b[1] - a[1]);
    const inc = cand.length ? cand[0][0] : null;
    let reg = null;
    if (q >= 1) {
      const liveHigh = plist.some(([, pl]) => prods.some(pr => ALLP[pr].tier === 'high' && ((pl.p || {})[pr] || {}).l != null));
      const w = { INSPECT: liveHigh ? 5 : 0.3, DPA: 2.2, JOURNAL: 1.8, BOARD: 1.6, EXPLAIN: 1.6, WHISTLE: 1.4, INSURER: 1.2, QUIET: 0.8 };
      if (q === 3 && !usedReg.includes('INSPECT') && liveHigh) w.INSPECT = 50;
      const opts = Object.keys(w).filter(k => !usedReg.includes(k) || k === 'QUIET').map(k => [k, w[k] * (0.6 + hash(seed + ':e:' + q + k))]).sort((a, b) => b[1] - a[1]);
      reg = opts.length ? opts[0][0] : 'QUIET';
    }
    return { inc, reg };
  }

  const api = { MULT, hash, shuffle, START, BUDGET, PEOPLE, ASSESS, DISCLOSE, BANFINE, SEV, TIER, W, WAREA, AREAS, C, FIXOF, F, N, EV, SECTORS, SKEYS, ALLP,
    productsFor, risksOf, stageOf, score, planInfo, drawEvents, has };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DeltaGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
