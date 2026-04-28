import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  PaperStatus,
  Priority,
  ResourceType,
  SubmissionStatus,
  ValidationErrorType,
  ValidationSeverity,
  VenueType,
} from '@/types/types';

const DAY_IN_MS = 86_400_000;
const DEMO_TAG = 'demo-video-2026';

type DemoCounterKey =
  | 'papers'
  | 'venues'
  | 'resources'
  | 'submissions'
  | 'fitScores'
  | 'validationErrors'
  | 'credentials'
  | 'publicationDomains'
  | 'emailStatuses';

interface DemoSeedResult {
  counts: Record<DemoCounterKey, number>;
  warnings: string[];
  summary: string;
}

interface DemoVenueDefinition {
  key: string;
  name: string;
  type: VenueType;
  priority: Priority;
  submission_url: string;
}

interface DemoPaperDefinition {
  key: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: string[];
  status: PaperStatus;
  createdDaysAgo: number;
  updatedDaysAgo: number;
  focus: string;
  references: string[];
  fitScores: Record<string, number>;
}

interface DemoResourceDefinition {
  name: string;
  type: ResourceType;
  description: string;
  tags: string[];
  file_url: string | null;
}

interface DemoSubmissionDefinition {
  paperKey: string;
  venueKey: string;
  status: SubmissionStatus;
  submittedDaysAgo: number;
  confirmation_id: string;
  detailed_status: string;
  notes: string;
}

interface DemoValidationDefinition {
  paperKey: string;
  error_type: ValidationErrorType;
  error_code: string;
  file_name: string | null;
  field_name: string | null;
  error_message: string;
  resolution_steps: string[];
  severity: ValidationSeverity;
}

interface DemoCredentialDefinition {
  venueKey: string;
  username: string;
  password: string;
  portal_url: string;
}

interface DemoPublicationDomainDefinition {
  key: string;
  name: string;
  domain: string;
  website_url: string;
  official_emails: string[];
}

interface DemoEmailDefinition {
  publicationDomainKey: string;
  email_id: string;
  sender: string;
  subject: string;
  receivedDaysAgo: number;
  inferred_status: string;
  email_snippet: string;
  full_body: string;
  is_new: boolean;
}

const demoVenues: DemoVenueDefinition[] = [
  {
    key: 'ieee-tetc',
    name: 'IEEE Transactions on Emerging Topics in Computing',
    type: 'Journal',
    priority: 'High',
    submission_url: 'https://mc.manuscriptcentral.com/ieee',
  },
  {
    key: 'agri',
    name: 'Computers and Electronics in Agriculture',
    type: 'Journal',
    priority: 'High',
    submission_url: 'https://www.editorialmanager.com/compag/default2.aspx',
  },
  {
    key: 'traffic',
    name: 'Transportation Research Part C',
    type: 'Journal',
    priority: 'High',
    submission_url: 'https://www.editorialmanager.com/trc/default2.aspx',
  },
  {
    key: 'education-ai',
    name: 'Computers & Education: Artificial Intelligence',
    type: 'Journal',
    priority: 'Medium',
    submission_url: 'https://www.editorialmanager.com/caeai/default2.aspx',
  },
  {
    key: 'sensors',
    name: 'Sensors',
    type: 'Journal',
    priority: 'Medium',
    submission_url: 'https://susy.mdpi.com/',
  },
  {
    key: 'expert-systems',
    name: 'Expert Systems with Applications',
    type: 'Journal',
    priority: 'High',
    submission_url: 'https://www.editorialmanager.com/eswa/default2.aspx',
  },
];

const demoPapers: DemoPaperDefinition[] = [
  {
    key: 'rural-health',
    title: 'Adaptive Federated Learning for Rural Healthcare Diagnostics',
    abstract:
      'This paper proposes an adaptive federated learning pipeline that keeps clinical screening models current across low-connectivity rural health centers. The study balances personalization, privacy, and edge inference cost while improving diagnostic accuracy for frontline care teams.',
    keywords: ['federated learning', 'rural healthcare', 'diagnostic AI', 'edge inference'],
    authors: ['Samiran Chakraborty', 'Ananya Roy'],
    status: 'Ready',
    createdDaysAgo: 48,
    updatedDaysAgo: 2,
    focus: 'privacy-aware diagnostic support across rural clinics with unstable connectivity',
    references: [
      'Smith J., Lee P. Federated Clinical Learning in Resource-Constrained Settings. IEEE Access, 2024.',
      'Roy A., Das S. Lightweight Edge Diagnostics for Community Health Systems. Journal of Medical Systems, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 91,
      agri: 32,
      traffic: 21,
      'education-ai': 35,
      sensors: 84,
      'expert-systems': 78,
    },
  },
  {
    key: 'crop-stress',
    title: 'Explainable Multimodal Crop Stress Detection with Edge Sensors',
    abstract:
      'We combine hyperspectral imagery, soil telemetry, and interpretable vision models to detect crop stress earlier than conventional scouting. The resulting workflow supports farm-level action while keeping decisions understandable to agronomists and growers.',
    keywords: ['crop stress', 'multimodal learning', 'edge sensors', 'explainable AI'],
    authors: ['Samiran Chakraborty', 'Moumita Sen'],
    status: 'Ready',
    createdDaysAgo: 36,
    updatedDaysAgo: 1,
    focus: 'multimodal sensing pipelines for explainable agricultural intelligence',
    references: [
      'Garcia R., Ahmed T. Interpretable Vision Models for Precision Agriculture. Computers and Electronics in Agriculture, 2024.',
      'Sen M., Kulkarni N. Multimodal Crop Monitoring with Edge Telemetry. Sensors, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 58,
      agri: 94,
      traffic: 18,
      'education-ai': 26,
      sensors: 87,
      'expert-systems': 76,
    },
  },
  {
    key: 'traffic-control',
    title: 'Graph Neural Signal Control for Mixed Urban Traffic',
    abstract:
      'This work studies graph neural control policies for adaptive signal timing in mixed traffic environments with buses, cars, and micromobility. The proposed controller improves corridor throughput while lowering average waiting time across congestion peaks.',
    keywords: ['graph neural networks', 'traffic control', 'urban mobility', 'reinforcement learning'],
    authors: ['Samiran Chakraborty', 'Ritwik Ghosh'],
    status: 'Ready',
    createdDaysAgo: 41,
    updatedDaysAgo: 4,
    focus: 'network-level traffic optimization for mixed urban transportation flows',
    references: [
      'Wang L., Perez M. Graph Reinforcement Learning for Urban Signal Control. Transportation Research Part C, 2024.',
      'Ghosh R., Yu H. Mixed Traffic Coordination with Intelligent Intersections. IEEE Transactions on Intelligent Transportation Systems, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 67,
      agri: 15,
      traffic: 96,
      'education-ai': 18,
      sensors: 61,
      'expert-systems': 74,
    },
  },
  {
    key: 'dropout-prediction',
    title: 'Privacy-Preserving Student Dropout Prediction in Blended Learning',
    abstract:
      'We evaluate privacy-preserving analytics for dropout prediction in blended learning platforms using encrypted engagement summaries and interpretable risk signals. The pipeline preserves student trust while helping instructors intervene earlier.',
    keywords: ['learning analytics', 'dropout prediction', 'privacy preserving AI', 'blended learning'],
    authors: ['Samiran Chakraborty', 'Sohini Dutta'],
    status: 'Ready',
    createdDaysAgo: 30,
    updatedDaysAgo: 6,
    focus: 'ethical learning analytics for early-risk detection in blended education environments',
    references: [
      'Dutta S., Hall M. Privacy-Aware Learning Analytics for At-Risk Students. Computers & Education: Artificial Intelligence, 2024.',
      'Nguyen P., Peters J. Interpretable Student Retention Models in Hybrid Classrooms. Learning Analytics Review, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 62,
      agri: 12,
      traffic: 17,
      'education-ai': 93,
      sensors: 25,
      'expert-systems': 79,
    },
  },
  {
    key: 'assamese-transformer',
    title: 'A Lightweight Transformer for Assamese Document Understanding',
    abstract:
      'The paper explores a lightweight transformer for Assamese document understanding with constrained supervision. The draft currently covers the model design and baseline experiments but still needs a stronger metadata and references pass before submission.',
    keywords: ['assamese NLP', 'document understanding'],
    authors: ['Samiran Chakraborty', 'Priyanka Baruah'],
    status: 'Draft',
    createdDaysAgo: 54,
    updatedDaysAgo: 23,
    focus: 'low-resource document intelligence for Assamese-language administrative records',
    references: [
      'Baruah P., Singh V. Compact Transformers for Low-Resource Script Understanding. ACL Findings, 2024.',
      'Kumar R., Das D. Document AI in Indic Languages. Information Processing and Management, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 72,
      agri: 10,
      traffic: 9,
      'education-ai': 46,
      sensors: 18,
      'expert-systems': 69,
    },
  },
  {
    key: 'arrhythmia-ecg',
    title: 'Low-Power Arrhythmia Detection on Wearable ECG Streams',
    abstract:
      'We design a low-power arrhythmia detection model for wearable ECG streams that preserves on-device latency budgets without sacrificing clinically relevant sensitivity. The manuscript is currently under review after a promising first editorial pass.',
    keywords: ['wearable ECG', 'arrhythmia detection', 'low-power AI', 'health monitoring'],
    authors: ['Samiran Chakraborty', 'Debosmita Paul'],
    status: 'Under Review',
    createdDaysAgo: 126,
    updatedDaysAgo: 118,
    focus: 'energy-efficient cardiac event detection on wearable sensing hardware',
    references: [
      'Paul D., Chen Y. Efficient ECG Event Classification on Wearable Platforms. Sensors, 2024.',
      'Lopez A., Nguyen T. TinyML Approaches for Continuous Cardiac Monitoring. Biomedical Signal Processing, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 79,
      agri: 14,
      traffic: 8,
      'education-ai': 12,
      sensors: 88,
      'expert-systems': 73,
    },
  },
  {
    key: 'landslide-mapping',
    title: 'Robust Landslide Susceptibility Mapping with Hybrid Remote Sensing',
    abstract:
      'This paper blends satellite imagery, topographic cues, and historical event traces for robust landslide susceptibility mapping. The workflow has already moved into the submitted stage and is waiting for editor assignment.',
    keywords: ['remote sensing', 'landslide mapping', 'geospatial AI', 'risk assessment'],
    authors: ['Samiran Chakraborty', 'Sagnik Bhunia'],
    status: 'Submitted',
    createdDaysAgo: 26,
    updatedDaysAgo: 3,
    focus: 'hybrid geospatial intelligence for landslide susceptibility estimation',
    references: [
      'Bhunia S., Zhao Q. Multi-Source Remote Sensing for Landslide Susceptibility. Remote Sensing, 2024.',
      'Rana K., Paul S. Terrain-Aware Hazard Mapping with Deep Learning. Natural Hazards Review, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 54,
      agri: 58,
      traffic: 24,
      'education-ai': 9,
      sensors: 83,
      'expert-systems': 69,
    },
  },
  {
    key: 'iot-bearings',
    title: 'Self-Supervised Fault Detection in Industrial IoT Bearings',
    abstract:
      'We introduce a self-supervised fault detection pipeline for industrial IoT bearings that maintains performance under sparse labeled failures. The work has already secured an acceptance and is moving into final camera-ready preparation.',
    keywords: ['industrial IoT', 'fault detection', 'self-supervised learning', 'predictive maintenance'],
    authors: ['Samiran Chakraborty', 'Avishek Das'],
    status: 'Accepted',
    createdDaysAgo: 64,
    updatedDaysAgo: 12,
    focus: 'predictive maintenance for industrial sensing systems with sparse failure labels',
    references: [
      'Das A., Petrov I. Self-Supervised Representation Learning for Industrial Fault Detection. Expert Systems with Applications, 2024.',
      'Hu J., Malik S. Bearing Health Monitoring in Industrial IoT Systems. Mechanical Systems and Signal Processing, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 68,
      agri: 16,
      traffic: 14,
      'education-ai': 8,
      sensors: 80,
      'expert-systems': 92,
    },
  },
  {
    key: 'claim-verification',
    title: 'Cross-Lingual Claim Verification for Disaster Misinformation',
    abstract:
      'This paper investigates cross-lingual claim verification for misinformation during disaster response, with a focus on rapid transfer across English and regional languages. A previous submission missed the venue scope and was declined, and the work is now being repositioned.',
    keywords: ['misinformation detection', 'claim verification', 'cross-lingual NLP', 'disaster response'],
    authors: ['Samiran Chakraborty', 'Ipsita Nandi'],
    status: 'Rejected',
    createdDaysAgo: 58,
    updatedDaysAgo: 18,
    focus: 'cross-lingual misinformation verification for emergency communication settings',
    references: [
      'Nandi I., Shah R. Multilingual Claim Verification in Crisis Communication. Information Processing and Management, 2024.',
      'Fernandez L., Bora S. Disaster Misinformation Detection Across Languages. ACL Workshop on CrisisNLP, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 64,
      agri: 5,
      traffic: 11,
      'education-ai': 28,
      sensors: 13,
      'expert-systems': 71,
    },
  },
  {
    key: 'microgrid-scheduling',
    title: 'Quantum-Inspired Scheduling for Smart Microgrids',
    abstract:
      'We present a quantum-inspired scheduler for smart microgrids that balances generation, storage, and demand volatility under operational constraints. The manuscript is currently under review and progressing on schedule.',
    keywords: ['smart microgrids', 'energy scheduling', 'quantum-inspired optimization', 'power systems'],
    authors: ['Samiran Chakraborty', 'Arka Pal'],
    status: 'Under Review',
    createdDaysAgo: 52,
    updatedDaysAgo: 28,
    focus: 'constraint-aware optimization for resilient microgrid dispatch and storage planning',
    references: [
      'Pal A., Chen J. Quantum-Inspired Optimization for Energy Scheduling. Expert Systems with Applications, 2024.',
      'Rossi F., Kumar P. Multi-Objective Dispatch in Smart Microgrids. Applied Energy, 2023.',
    ],
    fitScores: {
      'ieee-tetc': 76,
      agri: 9,
      traffic: 13,
      'education-ai': 6,
      sensors: 57,
      'expert-systems': 89,
    },
  },
];

const demoResources: DemoResourceDefinition[] = [
  {
    name: 'Federated Clinical Learning in Resource-Constrained Settings',
    type: 'Reference',
    description: 'Google Scholar reference on federated clinical prediction in low-resource hospitals.',
    tags: ['google-scholar', 'reference', 'federated learning', DEMO_TAG],
    file_url: 'https://scholar.google.com/scholar?q=federated+clinical+learning+resource+constrained+settings',
  },
  {
    name: 'Interpretable Vision Models for Precision Agriculture',
    type: 'Reference',
    description: 'Scholar-sourced paper covering explainable multimodal monitoring for crop health.',
    tags: ['google-scholar', 'reference', 'precision agriculture', DEMO_TAG],
    file_url: 'https://scholar.google.com/scholar?q=interpretable+vision+models+precision+agriculture',
  },
  {
    name: 'Rural Diagnostics Sensor Benchmark Dataset',
    type: 'Dataset',
    description: 'Curated benchmark for remote screening signals, symptom notes, and diagnostic labels.',
    tags: ['dataset', 'healthcare', 'edge AI', DEMO_TAG],
    file_url: 'https://zenodo.org/records/10938485',
  },
  {
    name: 'Traffic Signal Graph RL Baseline',
    type: 'Code',
    description: 'Reference implementation for graph-based traffic signal control experiments.',
    tags: ['code', 'traffic', 'graph neural networks', DEMO_TAG],
    file_url: 'https://github.com/openai/grade-school-math',
  },
  {
    name: 'Reviewer Response Playbook',
    type: 'Note',
    description: 'Internal note with patterns for reviewer-response mapping, revisions, and rebuttal framing.',
    tags: ['note', 'review process', DEMO_TAG],
    file_url: null,
  },
  {
    name: 'IEEE Manuscript Checklist',
    type: 'Document',
    description: 'Submission-ready checklist for title, abstract, keywords, references, and final file packaging.',
    tags: ['document', 'submission', 'ieee', DEMO_TAG],
    file_url: 'https://www.ieee.org/content/dam/ieee-org/ieee/web/org/pubs/author-guide.pdf',
  },
  {
    name: 'Privacy-Aware Learning Analytics Survey',
    type: 'Reference',
    description: 'Survey covering privacy-preserving student analytics and intervention readiness.',
    tags: ['reference', 'learning analytics', 'privacy', DEMO_TAG],
    file_url: 'https://scholar.google.com/scholar?q=privacy+aware+learning+analytics+survey',
  },
];

const demoSubmissions: DemoSubmissionDefinition[] = [
  {
    paperKey: 'landslide-mapping',
    venueKey: 'sensors',
    status: 'Submitted',
    submittedDaysAgo: 3,
    confirmation_id: 'DEMO-SUB-2026-001',
    detailed_status: 'Awaiting editor assignment',
    notes: 'Initial submission package sent successfully from the in-app portal assistant.',
  },
  {
    paperKey: 'arrhythmia-ecg',
    venueKey: 'sensors',
    status: 'Under Review',
    submittedDaysAgo: 118,
    confirmation_id: 'DEMO-SUB-2026-002',
    detailed_status: 'With reviewers',
    notes: 'Review cycle has exceeded the normal turnaround window and should be monitored.',
  },
  {
    paperKey: 'iot-bearings',
    venueKey: 'expert-systems',
    status: 'Accepted',
    submittedDaysAgo: 39,
    confirmation_id: 'DEMO-SUB-2026-003',
    detailed_status: 'Accepted with final files requested',
    notes: 'Acceptance received and camera-ready package is being prepared.',
  },
  {
    paperKey: 'claim-verification',
    venueKey: 'traffic',
    status: 'Rejected',
    submittedDaysAgo: 44,
    confirmation_id: 'DEMO-SUB-2026-004',
    detailed_status: 'Declined after editor screening',
    notes: 'Scope mismatch was the main reason for rejection at this venue.',
  },
  {
    paperKey: 'microgrid-scheduling',
    venueKey: 'expert-systems',
    status: 'Under Review',
    submittedDaysAgo: 28,
    confirmation_id: 'DEMO-SUB-2026-005',
    detailed_status: 'Under review',
    notes: 'This review cycle is healthy and still within the expected turnaround window.',
  },
  {
    paperKey: 'traffic-control',
    venueKey: 'sensors',
    status: 'Rejected',
    submittedDaysAgo: 92,
    confirmation_id: 'DEMO-SUB-2026-006',
    detailed_status: 'Rejected after first editorial review',
    notes: 'Useful for demonstrating submission-history penalties in the optimizer.',
  },
];

const demoValidationErrors: DemoValidationDefinition[] = [
  {
    paperKey: 'assamese-transformer',
    error_type: 'missing_metadata',
    error_code: 'DEMO-MISSING-KEYWORDS-001',
    file_name: 'assamese_transformer_draft.docx',
    field_name: 'keywords',
    error_message: 'Keywords are incomplete for this draft and should be expanded before submission.',
    resolution_steps: [
      'Add at least three venue-relevant keywords.',
      'Align the keywords with document understanding and low-resource NLP scope.',
    ],
    severity: 'error',
  },
  {
    paperKey: 'assamese-transformer',
    error_type: 'citation_format',
    error_code: 'DEMO-CITATION-STYLE-001',
    file_name: 'assamese_transformer_draft.docx',
    field_name: 'references',
    error_message: 'References need to be normalized to the target venue citation style.',
    resolution_steps: [
      'Regenerate the bibliography in the venue style.',
      'Check capitalization and DOI formatting in the final references section.',
    ],
    severity: 'warning',
  },
  {
    paperKey: 'rural-health',
    error_type: 'image_compliance',
    error_code: 'DEMO-FIGURE-CHECK-001',
    file_name: 'rural_health_figures.zip',
    field_name: 'Figure 2',
    error_message: 'Figure contrast should be verified for grayscale printing before final upload.',
    resolution_steps: [
      'Run the figure pack through grayscale verification.',
      'Increase axis-label contrast for the final PDF export.',
    ],
    severity: 'info',
  },
];

const demoCredentials: DemoCredentialDefinition[] = [
  {
    venueKey: 'ieee-tetc',
    username: 'author.demo@publishkaro.ai',
    password: 'DemoPass!2026',
    portal_url: 'https://mc.manuscriptcentral.com/ieee',
  },
  {
    venueKey: 'sensors',
    username: 'sensors.demo@publishkaro.ai',
    password: 'DemoPass!2026',
    portal_url: 'https://susy.mdpi.com/',
  },
  {
    venueKey: 'expert-systems',
    username: 'eswa.demo@publishkaro.ai',
    password: 'DemoPass!2026',
    portal_url: 'https://www.editorialmanager.com/eswa/default2.aspx',
  },
];

const demoPublicationDomains: DemoPublicationDomainDefinition[] = [
  {
    key: 'ieee',
    name: 'IEEE Author Center',
    domain: 'ieee.org',
    website_url: 'https://www.ieee.org/publications/rights/author-center.html',
    official_emails: ['no-reply@ieee.org', 'editorial@ieee.org'],
  },
  {
    key: 'elsevier',
    name: 'Elsevier Editorial System',
    domain: 'elsevier.com',
    website_url: 'https://service.elsevier.com/app/home/supporthub/publishing/',
    official_emails: ['em@elsevier.com', 'revisions@elsevier.com'],
  },
  {
    key: 'springer',
    name: 'Springer Nature Editorial Office',
    domain: 'springernature.com',
    website_url: 'https://www.springernature.com/gp/authors',
    official_emails: ['editorial.office@springernature.com', 'submission@springernature.com'],
  },
  {
    key: 'acm',
    name: 'ACM Author Gateway',
    domain: 'acm.org',
    website_url: 'https://authors.acm.org/',
    official_emails: ['noreply@acm.org', 'proceedings@acm.org'],
  },
];

const demoEmails: DemoEmailDefinition[] = [
  {
    publicationDomainKey: 'ieee',
    email_id: 'demo-email-2026-001',
    sender: 'no-reply@ieee.org',
    subject: 'Submission Confirmation: Manuscript RF-2026-0142 has been submitted',
    receivedDaysAgo: 3,
    inferred_status: 'submission_confirmation',
    email_snippet:
      'Thank you for your submission. Your manuscript ID is RF-2026-0142 and it has been routed for editorial checks.',
    full_body:
      'Thank you for your submission. Your manuscript ID is RF-2026-0142. The paper has been submitted successfully and is now awaiting editor assignment.',
    is_new: false,
  },
  {
    publicationDomainKey: 'springer',
    email_id: 'demo-email-2026-002',
    sender: 'editorial.office@springernature.com',
    subject: 'Reviewer comments available for manuscript SN-2026-0219',
    receivedDaysAgo: 2,
    inferred_status: 'reviewer_comments',
    email_snippet:
      'Reviewer comments are now available. Please review the attached reports before preparing the next response.',
    full_body:
      'Reviewer comments are now available for manuscript SN-2026-0219. The editor has asked the authors to review the reports and prepare a response plan.',
    is_new: true,
  },
  {
    publicationDomainKey: 'elsevier',
    email_id: 'demo-email-2026-003',
    sender: 'revisions@elsevier.com',
    subject: 'Major revision required for manuscript ESWA-2026-0221',
    receivedDaysAgo: 1,
    inferred_status: 'revision_request',
    email_snippet:
      'A major revision is required. Please submit your revision along with a point-by-point response within 21 days.',
    full_body:
      'A major revision is required for manuscript ESWA-2026-0221. Please submit your revision, revised files, and a detailed response to reviewer comments within 21 days.',
    is_new: true,
  },
  {
    publicationDomainKey: 'ieee',
    email_id: 'demo-email-2026-004',
    sender: 'editorial@ieee.org',
    subject: 'Acceptance notification for manuscript TETC-2026-0174',
    receivedDaysAgo: 4,
    inferred_status: 'acceptance',
    email_snippet:
      'Congratulations. We are pleased to inform you that your manuscript has been accepted for publication.',
    full_body:
      'Congratulations. We are pleased to inform you that manuscript TETC-2026-0174 has been accepted for publication, subject to final production checks.',
    is_new: true,
  },
  {
    publicationDomainKey: 'acm',
    email_id: 'demo-email-2026-005',
    sender: 'noreply@acm.org',
    subject: 'We are unable to accept your manuscript ACM-2026-0093',
    receivedDaysAgo: 5,
    inferred_status: 'rejection',
    email_snippet:
      'After editorial review, the paper was not accepted because the venue scope did not align closely enough with the manuscript focus.',
    full_body:
      'We are unable to accept manuscript ACM-2026-0093. The decision followed editorial screening and reflects a venue-scope mismatch rather than a lack of merit.',
    is_new: false,
  },
  {
    publicationDomainKey: 'acm',
    email_id: 'demo-email-2026-006',
    sender: 'proceedings@acm.org',
    subject: 'Camera-ready deadline approaching for accepted paper ACM-SIG-2026-0110',
    receivedDaysAgo: 1,
    inferred_status: 'camera_ready_deadline',
    email_snippet:
      'Camera-ready submission, copyright form, and final files due in 48 hours.',
    full_body:
      'This is a reminder that the camera-ready submission, copyright form, and final files are due within 48 hours for accepted paper ACM-SIG-2026-0110.',
    is_new: true,
  },
];

function isoDaysAgo(days: number, minutesOffset = 0) {
  return new Date(Date.now() - days * DAY_IN_MS - minutesOffset * 60_000).toISOString();
}

function buildPaperContent(paper: DemoPaperDefinition) {
  const referencesSection = paper.references.map((reference, index) => `[${index + 1}] ${reference}`).join('\n');

  return `# Abstract

${paper.abstract}

# Introduction

${paper.title} focuses on ${paper.focus}. The current manuscript positions the problem in terms of measurable research impact, reproducible experimentation, and a realistic publication path.

# Methodology

The study uses ${paper.keywords.slice(0, 2).join(' and ')} to structure the evaluation pipeline. Experiments are designed to be repeatable, resource-aware, and aligned with the expectations of peer-reviewed publication venues.

# Results

The current draft reports stronger performance than the baseline across accuracy, stability, and deployment practicality. The result narrative is organized so it can be reused cleanly in cover letters, submission metadata, and rebuttal workflows.

# Discussion

The discussion emphasizes tradeoffs, scope fit, and limitations that matter during venue selection. This keeps the paper useful not only as a manuscript, but also as a decision object for the Best Slot to Apply workflow.

# References

${referencesSection}`;
}

function buildDraftContent(paper: DemoPaperDefinition) {
  return `# Abstract

${paper.abstract}

# Introduction

${paper.title} focuses on ${paper.focus}. The core technical direction is stable, but the draft still needs stronger metadata completion and final references alignment.

# Methodology

The current draft uses ${paper.keywords.join(', ')} as its working technical backbone. Additional experiments and citation cleanup are still in progress.`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown error';
}

function createCounters(): Record<DemoCounterKey, number> {
  return {
    papers: 0,
    venues: 0,
    resources: 0,
    submissions: 0,
    fitScores: 0,
    validationErrors: 0,
    credentials: 0,
    publicationDomains: 0,
    emailStatuses: 0,
  };
}

function buildFitReason(paper: DemoPaperDefinition, venue: DemoVenueDefinition, score: number) {
  if (score >= 85) {
    return `${venue.name} is a strong match for ${paper.title} because the paper's keywords and evaluation focus align closely with the venue scope.`;
  }

  if (score >= 70) {
    return `${venue.name} is a workable target for ${paper.title}, with solid topic overlap and a credible submission path after minor framing adjustments.`;
  }

  if (score >= 45) {
    return `${venue.name} is a moderate fit for ${paper.title}. The core idea is relevant, but the paper would need sharper positioning for this audience.`;
  }

  return `${venue.name} is a low-fit venue for ${paper.title}. The manuscript would likely face scope friction without substantial repositioning.`;
}

function buildStrengths(paper: DemoPaperDefinition, venue: DemoVenueDefinition, score: number) {
  const strengths = [`Keywords align with ${paper.keywords.slice(0, 2).join(' and ')}.`];

  if (venue.type === 'Journal') {
    strengths.push('The manuscript has enough depth for a journal-style review cycle.');
  }

  if (score >= 80) {
    strengths.push('The current framing maps cleanly to the venue scope and readership.');
  }

  return strengths;
}

function buildWeaknesses(paper: DemoPaperDefinition, score: number) {
  if (score >= 85) {
    return ['Competition is high, so the abstract and contribution statement should stay crisp.'];
  }

  if (score >= 70) {
    return ['The introduction could make the contribution boundaries more explicit.'];
  }

  if (score >= 45) {
    return [
      'Scope alignment is only partial.',
      `The paper should emphasize ${paper.keywords[0]} more explicitly for the target venue.`,
    ];
  }

  return ['Scope mismatch is likely.', 'A different venue would use the contribution more effectively.'];
}

function countNonZero(values: Record<DemoCounterKey, number>) {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

export async function seedDemoData(
  supabase: SupabaseClient,
  user: User
): Promise<DemoSeedResult> {
  const counts = createCounters();
  const warnings: string[] = [];

  const venueNames = demoVenues.map((venue) => venue.name);
  const paperTitles = demoPapers.map((paper) => paper.title);
  const resourceNames = demoResources.map((resource) => resource.name);
  const submissionIds = demoSubmissions.map((submission) => submission.confirmation_id);
  const validationCodes = demoValidationErrors.map((error) => error.error_code);
  const publicationDomains = demoPublicationDomains.map((domain) => domain.domain);
  const emailIds = demoEmails.map((email) => email.email_id);

  const { data: existingVenues, error: venueReadError } = await supabase
    .from('venues')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', venueNames);

  if (venueReadError) throw venueReadError;

  const existingVenueNames = new Set((existingVenues ?? []).map((venue) => venue.name));
  const missingVenues = demoVenues.filter((venue) => !existingVenueNames.has(venue.name));

  if (missingVenues.length > 0) {
    const { error } = await supabase.from('venues').insert(
      missingVenues.map((venue) => ({
        name: venue.name,
        type: venue.type,
        submission_url: venue.submission_url,
        priority: venue.priority,
        user_id: user.id,
      }))
    );

    if (error) throw error;
    counts.venues = missingVenues.length;
  }

  const { data: venueRows, error: venueMapError } = await supabase
    .from('venues')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', venueNames);

  if (venueMapError) throw venueMapError;

  const venueIdByKey = Object.fromEntries(
    demoVenues.map((venue) => [venue.key, venueRows?.find((row) => row.name === venue.name)?.id ?? ''])
  ) as Record<string, string>;

  const { data: existingPapers, error: paperReadError } = await supabase
    .from('papers')
    .select('id, title')
    .eq('user_id', user.id)
    .in('title', paperTitles);

  if (paperReadError) throw paperReadError;

  const existingPaperTitles = new Set((existingPapers ?? []).map((paper) => paper.title));
  const missingPapers = demoPapers.filter((paper) => !existingPaperTitles.has(paper.title));

  if (missingPapers.length > 0) {
    const { error } = await supabase.from('papers').insert(
      missingPapers.map((paper, index) => ({
        title: paper.title,
        abstract: paper.abstract,
        content: paper.status === 'Draft' ? buildDraftContent(paper) : buildPaperContent(paper),
        keywords: paper.keywords,
        authors: paper.authors,
        status: paper.status,
        user_id: user.id,
        created_at: isoDaysAgo(paper.createdDaysAgo, index),
        updated_at: isoDaysAgo(paper.updatedDaysAgo, index),
      }))
    );

    if (error) throw error;
    counts.papers = missingPapers.length;
  }

  const { data: paperRows, error: paperMapError } = await supabase
    .from('papers')
    .select('id, title')
    .eq('user_id', user.id)
    .in('title', paperTitles);

  if (paperMapError) throw paperMapError;

  const paperIdByKey = Object.fromEntries(
    demoPapers.map((paper) => [paper.key, paperRows?.find((row) => row.title === paper.title)?.id ?? ''])
  ) as Record<string, string>;

  const { data: existingResources, error: resourceReadError } = await supabase
    .from('resources')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', resourceNames);

  if (resourceReadError) throw resourceReadError;

  const existingResourceNames = new Set((existingResources ?? []).map((resource) => resource.name));
  const missingResources = demoResources.filter((resource) => !existingResourceNames.has(resource.name));

  if (missingResources.length > 0) {
    const { error } = await supabase.from('resources').insert(
      missingResources.map((resource) => ({
        name: resource.name,
        type: resource.type,
        description: resource.description,
        tags: resource.tags,
        file_url: resource.file_url,
        user_id: user.id,
      }))
    );

    if (error) {
      warnings.push(`Resource Inventory seed skipped: ${getErrorMessage(error)}`);
    } else {
      counts.resources = missingResources.length;
    }
  }

  const fitScoreRows = demoPapers.flatMap((paper) =>
    demoVenues.map((venue) => {
      const fitScore = paper.fitScores[venue.key] ?? 40;

      return {
        paper_id: paperIdByKey[paper.key],
        venue_id: venueIdByKey[venue.key],
        fit_score: fitScore,
        reason_summary: buildFitReason(paper, venue, fitScore),
        strengths: buildStrengths(paper, venue, fitScore),
        weaknesses: buildWeaknesses(paper, fitScore),
        analysed_at: isoDaysAgo(Math.max(paper.updatedDaysAgo - 1, 0)),
      };
    })
  );

  const paperIds = Object.values(paperIdByKey).filter(Boolean);
  const venueIds = Object.values(venueIdByKey).filter(Boolean);

  if (paperIds.length > 0 && venueIds.length > 0) {
    const { data: existingFitScores, error: fitReadError } = await supabase
      .from('venue_fit_scores')
      .select('paper_id, venue_id')
      .in('paper_id', paperIds)
      .in('venue_id', venueIds);

    if (fitReadError) {
      warnings.push(`Fit score lookup skipped: ${getErrorMessage(fitReadError)}`);
    } else {
      const existingPairs = new Set(
        (existingFitScores ?? []).map((row) => `${row.paper_id}:${row.venue_id}`)
      );
      counts.fitScores = fitScoreRows.filter(
        (row) => !existingPairs.has(`${row.paper_id}:${row.venue_id}`)
      ).length;
    }

    const { error: fitUpsertError } = await supabase
      .from('venue_fit_scores')
      .upsert(fitScoreRows, { onConflict: 'paper_id,venue_id' });

    if (fitUpsertError) {
      warnings.push(`Scope scoring seed skipped: ${getErrorMessage(fitUpsertError)}`);
      counts.fitScores = 0;
    }
  }

  const { data: existingSubmissions, error: submissionReadError } = await supabase
    .from('submissions')
    .select('confirmation_id')
    .in('confirmation_id', submissionIds);

  if (submissionReadError) {
    warnings.push(`Submission history lookup skipped: ${getErrorMessage(submissionReadError)}`);
  } else {
    const existingSubmissionIds = new Set(
      (existingSubmissions ?? []).map((submission) => submission.confirmation_id)
    );
    const missingSubmissionRows = demoSubmissions
      .filter((submission) => !existingSubmissionIds.has(submission.confirmation_id))
      .map((submission, index) => ({
        paper_id: paperIdByKey[submission.paperKey],
        venue_id: venueIdByKey[submission.venueKey],
        status: submission.status,
        submitted_at: isoDaysAgo(submission.submittedDaysAgo, index),
        notes: `${submission.notes} [${DEMO_TAG}]`,
        detailed_status: submission.detailed_status,
        confirmation_id: submission.confirmation_id,
      }));

    if (missingSubmissionRows.length > 0) {
      const { error } = await supabase.from('submissions').insert(missingSubmissionRows);
      if (error) {
        warnings.push(`Submission history seed skipped: ${getErrorMessage(error)}`);
      } else {
        counts.submissions = missingSubmissionRows.length;
      }
    }
  }

  const { data: existingValidationErrors, error: validationReadError } = await supabase
    .from('validation_errors')
    .select('error_code')
    .eq('user_id', user.id)
    .in('error_code', validationCodes);

  if (validationReadError) {
    warnings.push(`Validation lookup skipped: ${getErrorMessage(validationReadError)}`);
  } else {
    const existingCodes = new Set(
      (existingValidationErrors ?? []).map((validationError) => validationError.error_code)
    );
    const missingValidationRows = demoValidationErrors
      .filter((validationError) => !existingCodes.has(validationError.error_code))
      .map((validationError, index) => ({
        paper_id: paperIdByKey[validationError.paperKey],
        user_id: user.id,
        submission_id: null,
        error_type: validationError.error_type,
        error_code: validationError.error_code,
        file_name: validationError.file_name,
        field_name: validationError.field_name,
        error_message: validationError.error_message,
        resolution_steps: validationError.resolution_steps,
        severity: validationError.severity,
        is_resolved: false,
        resolved_at: null,
        created_at: isoDaysAgo(Math.max(2 + index, 1)),
      }));

    if (missingValidationRows.length > 0) {
      const { error } = await supabase.from('validation_errors').insert(missingValidationRows);
      if (error) {
        warnings.push(`Validation seed skipped: ${getErrorMessage(error)}`);
      } else {
        counts.validationErrors = missingValidationRows.length;
      }
    }
  }

  const { data: existingCredentials, error: credentialReadError } = await supabase
    .from('credentials')
    .select('venue_id, username')
    .eq('user_id', user.id)
    .in('venue_id', Object.values(venueIdByKey));

  if (credentialReadError) {
    warnings.push(`Credential lookup skipped: ${getErrorMessage(credentialReadError)}`);
  } else {
    const existingCredentialPairs = new Set(
      (existingCredentials ?? []).map((credential) => `${credential.venue_id}:${credential.username}`)
    );
    const missingCredentialRows = demoCredentials
      .filter((credential) => {
        const venueId = venueIdByKey[credential.venueKey];
        return !existingCredentialPairs.has(`${venueId}:${credential.username}`);
      })
      .map((credential) => ({
        venue_id: venueIdByKey[credential.venueKey],
        username: credential.username,
        encrypted_password: btoa(credential.password),
        portal_url: credential.portal_url,
        user_id: user.id,
      }));

    if (missingCredentialRows.length > 0) {
      const { error } = await supabase.from('credentials').insert(missingCredentialRows);
      if (error) {
        warnings.push(`Credential Vault seed skipped: ${getErrorMessage(error)}`);
      } else {
        counts.credentials = missingCredentialRows.length;
      }
    }
  }

  const { data: existingDomains, error: domainReadError } = await supabase
    .from('publication_domains')
    .select('id, domain')
    .in('domain', publicationDomains);

  if (domainReadError) {
    warnings.push(`Publication sender domain lookup skipped: ${getErrorMessage(domainReadError)}`);
  } else {
    const existingDomainNames = new Set((existingDomains ?? []).map((domain) => domain.domain));
    const missingDomainRows = demoPublicationDomains
      .filter((domain) => !existingDomainNames.has(domain.domain))
      .map((domain) => ({
        name: domain.name,
        domain: domain.domain,
        website_url: domain.website_url,
        official_emails: domain.official_emails,
      }));

    if (missingDomainRows.length > 0) {
      const { error } = await supabase.from('publication_domains').insert(missingDomainRows);
      if (error) {
        warnings.push(`Publication sender domain seed skipped: ${getErrorMessage(error)}`);
      } else {
        counts.publicationDomains = missingDomainRows.length;
      }
    }
  }

  const { data: domainRows, error: domainMapError } = await supabase
    .from('publication_domains')
    .select('id, domain')
    .in('domain', publicationDomains);

  if (domainMapError) {
    warnings.push(`Publication sender domain refresh skipped: ${getErrorMessage(domainMapError)}`);
  } else {
    const domainIdByKey = Object.fromEntries(
      demoPublicationDomains.map((domain) => [
        domain.key,
        domainRows?.find((row) => row.domain === domain.domain)?.id ?? '',
      ])
    ) as Record<string, string>;

    const { data: existingEmailStatuses, error: emailReadError } = await supabase
      .from('email_statuses')
      .select('email_id')
      .eq('user_id', user.id)
      .in('email_id', emailIds);

    if (emailReadError) {
      warnings.push(`Email alert lookup skipped: ${getErrorMessage(emailReadError)}`);
    } else {
      const existingEmailIds = new Set(
        (existingEmailStatuses ?? []).map((emailStatus) => emailStatus.email_id)
      );
      const missingEmailRows = demoEmails
        .filter((email) => !existingEmailIds.has(email.email_id))
        .map((email, index) => ({
          user_id: user.id,
          publication_domain_id: domainIdByKey[email.publicationDomainKey],
          email_id: email.email_id,
          sender: email.sender,
          subject: email.subject,
          received_date: isoDaysAgo(email.receivedDaysAgo, index),
          inferred_status: email.inferred_status,
          email_snippet: email.email_snippet,
          full_body: email.full_body,
          is_new: email.is_new,
        }));

      if (missingEmailRows.length > 0) {
        const { error } = await supabase.from('email_statuses').insert(missingEmailRows);
        if (error) {
          warnings.push(`Email monitoring seed skipped: ${getErrorMessage(error)}`);
        } else {
          counts.emailStatuses = missingEmailRows.length;
        }
      }
    }
  }

  const insertedRecords = countNonZero(counts);
  const summary =
    insertedRecords === 0
      ? 'Demo dataset was already present.'
      : `Loaded demo data across ${insertedRecords} new records for the MVP video.`;

  return {
    counts,
    warnings,
    summary,
  };
}
