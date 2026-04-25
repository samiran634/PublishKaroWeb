export type PaperStatus = 'Draft' | 'Ready' | 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected';
export type SubmissionStatus = 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected';
export type VenueType = 'Journal' | 'Conference';
export type Priority = 'High' | 'Medium' | 'Low';
export type ResourceType = 'Reference' | 'Dataset' | 'Code' | 'Note' | 'Document';
export type LogStatus = 'success' | 'failure' | 'pending' | 'warning';
export type TaskType = 'submission' | 'resubmission';
export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type EmailProvider = 'gmail' | 'outlook';
export type ScanFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';
export type AuditStatus = 'success' | 'failure' | 'warning';
export type FollowUpReason = 'status_inquiry' | 'deadline_extension' | 'withdrawal' | 'other';
export type TeamRole = 'owner' | 'editor' | 'reviewer' | 'viewer';
export type TeamMemberStatus = 'pending' | 'active' | 'declined';
export type CollabTaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Paper {
    id: string;
    title: string;
    abstract: string | null;
    content: string | null;
    keywords: string[] | null;
    authors: string[] | null;
    status: PaperStatus;
    created_at: string;
    updated_at: string;
}

export interface PaperVersion {
    id: string;
    paper_id: string;
    content: string;
    version_number: number;
    notes: string | null;
    created_at: string;
}

export interface Venue {
    id: string;
    name: string;
    type: VenueType;
    submission_url: string | null;
    priority: Priority;
    created_at: string;
}

export interface Submission {
    id: string;
    paper_id: string;
    venue_id: string;
    status: SubmissionStatus;
    submitted_at: string;
    notes: string | null;
    detailed_status?: string | null;
    confirmation_id?: string | null;
    automation_task_id?: string | null;
}

export interface Resource {
    id: string;
    name: string;
    type: ResourceType;
    file_url: string | null;
    tags: string[] | null;
    description: string | null;
    created_at: string;
}

export interface PaperResource {
    paper_id: string;
    resource_id: string;
}

export interface Credential {
    id: string;
    venue_id: string;
    username: string;
    encrypted_password: string;
    portal_url: string;
    created_at: string;
    updated_at: string;
}

export interface SubmissionLog {
    id: string;
    submission_id: string | null;
    action_type: string;
    action_description: string;
    status: LogStatus;
    details: Record<string, unknown> | null;
    created_at: string;
}

export interface AutomationTask {
    id: string;
    paper_id: string;
    venue_id: string;
    task_type: TaskType;
    status: TaskStatus;
    priority: number;
    parent_submission_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface EmailMonitor {
    id: string;
    venue_id: string;
    email_domain: string;
    sender_addresses: string[] | null;
    keywords: Record<string, string[]>;
    monitoring_enabled: boolean;
    created_at: string;
}

export interface PriorityList {
    id: string;
    paper_id: string;
    venue_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface SubmissionWithDetails extends Submission {
    paper?: Paper;
    venue?: Venue;
}

export interface PaperWithSubmissions extends Paper {
    submissions?: SubmissionWithDetails[];
}

export interface AutomationTaskWithDetails extends AutomationTask {
    paper?: Paper;
    venue?: Venue;
}

export interface PublicationDomain {
    id: string;
    name: string;
    domain: string;
    website_url: string | null;
    official_emails: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmailConnection {
    id: string;
    user_id: string;
    provider: EmailProvider;
    email_address: string;
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ScanConfiguration {
    id: string;
    user_id: string;
    publication_domain_id: string;
    scan_frequency: ScanFrequency;
    is_enabled: boolean;
    search_keywords: string[];
    last_scan_at: string | null;
    next_scan_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface EmailStatus {
    id: string;
    user_id: string;
    publication_domain_id: string;
    email_id: string;
    sender: string;
    subject: string;
    received_date: string;
    inferred_status: string | null;
    email_snippet: string | null;
    full_body: string | null;
    is_new: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmailAuditLog {
    id: string;
    user_id: string;
    activity_type: AuditActivityType;
    publication_domain_id: string | null;
    details: Record<string, unknown> | null;
    status: AuditStatus;
    error_message: string | null;
    created_at: string;
}

export interface EmailStatusWithDomain extends EmailStatus {
    publication_domain?: PublicationDomain;
}

export interface ScanConfigurationWithDomain extends ScanConfiguration {
    publication_domain?: PublicationDomain;
}

export interface CoverLetter {
    id: string;
    user_id: string;
    paper_id: string;
    venue_id: string;
    content: string;
    is_approved: boolean;
    created_at: string;
    updated_at: string;
}

export interface ReviewerResponse {
    id: string;
    user_id: string;
    paper_id: string;
    submission_id: string;
    reviewer_comments: string;
    generated_response: string;
    is_approved: boolean;
    created_at: string;
    updated_at: string;
}

export interface FollowUpEmail {
    id: string;
    user_id: string;
    submission_id: string;
    venue_id: string;
    reason: FollowUpReason;
    content: string;
    is_sent: boolean;
    sent_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Deadline {
    id: string;
    user_id: string;
    paper_id: string | null;
    venue_id: string | null;
    submission_id: string | null;
    title: string;
    deadline_date: string;
    reminder_intervals: number[];
    is_completed: boolean;
    created_at: string;
    updated_at: string;
}

export interface CoverLetterWithDetails extends CoverLetter {
    paper?: Paper;
    venue?: Venue;
}

export interface ReviewerResponseWithDetails extends ReviewerResponse {
    paper?: Paper;
    submission?: Submission;
}

export interface FollowUpEmailWithDetails extends FollowUpEmail {
    submission?: Submission;
    venue?: Venue;
}

export interface DeadlineWithDetails extends Deadline {
    paper?: Paper;
    venue?: Venue;
    submission?: Submission;
}

export interface Team {
    id: string;
    paper_id: string;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    email: string;
    role: TeamRole;
    status: TeamMemberStatus;
    invited_at: string;
    joined_at: string | null;
}

export interface CollabTask {
    id: string;
    team_id: string;
    paper_id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    created_by: string | null;
    status: CollabTaskStatus;
    deadline: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    team_id: string;
    sender_id: string | null;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface PaperReference {
    id: string;
    user_id: string;
    paper_id: string;
    citation_key: string;
    title: string;
    authors: string[];
    year: number | null;
    publication: string | null;
    doi: string | null;
    url: string | null;
    bibtex: string | null;
    created_at: string;
    updated_at: string;
}

export interface TeamWithDetails extends Team {
    paper?: Paper;
    members?: TeamMember[];
}

export interface CollabTaskWithDetails extends CollabTask {
    team?: Team;
    paper?: Paper;
}

export interface MessageWithDetails extends Message {
    team?: Team;
}

// Plagiarism check types
export type PlagiarismCheckStatus = 'checking' | 'completed' | 'failed';

export interface MatchedSource {
    source_url: string;
    source_title: string;
    similarity_percentage: number;
    matched_text: string;
}

export interface PlagiarismCheck {
    id: string;
    paper_id: string;
    user_id: string;
    abstract_text: string;
    similarity_percentage: number | null;
    originality_score: number | null;
    status: PlagiarismCheckStatus;
    matched_sources: MatchedSource[];
    report_url: string | null;
    error_message: string | null;
    checked_at: string;
    created_at: string;
}

export interface PlagiarismCheckWithPaper extends PlagiarismCheck {
    paper?: Paper;
}

// Validation error types
export type ValidationErrorType =
    | 'file_size'
    | 'file_format'
    | 'file_naming'
    | 'missing_metadata'
    | 'invalid_metadata'
    | 'image_compliance'
    | 'citation_format'
    | 'plagiarism_threshold';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
    id: string;
    paper_id: string;
    user_id: string;
    submission_id: string | null;
    error_type: ValidationErrorType;
    error_code: string;
    file_name: string | null;
    field_name: string | null;
    error_message: string;
    resolution_steps: string[];
    severity: ValidationSeverity;
    is_resolved: boolean;
    resolved_at: string | null;
    created_at: string;
}

export interface ValidationErrorWithPaper extends ValidationError {
    paper?: Paper;
}

// Audit log types
export type AuditActivityType =
    | 'plagiarism_check'
    | 'validation_check'
    | 'submission_attempt'
    | 'file_upload'
    | 'metadata_update'
    | 'format_conversion'
    | 'auto_correction'
    | 'email_scan'
    | 'status_update';

export type AuditLogStatus = 'success' | 'failure' | 'warning' | 'info';

export interface AuditLog {
    id: string;
    user_id: string | null;
    paper_id: string | null;
    submission_id: string | null;
    activity_type: AuditActivityType;
    activity_description: string;
    status: AuditLogStatus;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface AuditLogWithDetails extends AuditLog {
    paper?: Paper;
    submission?: Submission;
}
