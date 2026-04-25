import type { ValidationError, ValidationErrorType, ValidationSeverity } from '@/types/types';

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
    PAPER: 10 * 1024 * 1024, // 10MB
    SUPPLEMENTARY: 5 * 1024 * 1024, // 5MB
    IMAGE: 2 * 1024 * 1024, // 2MB
};

// Allowed file formats
export const ALLOWED_FORMATS = {
    PAPER: ['.pdf', '.docx', '.tex', '.latex'],
    SUPPLEMENTARY: ['.pdf', '.docx', '.xlsx', '.zip', '.txt'],
    IMAGE: ['.png', '.jpg', '.jpeg', '.tiff', '.eps'],
};

// Validation error messages with resolution steps
export const ERROR_MESSAGES: Record<string, {
    message: (details: Record<string, string | number>) => string;
    resolutionSteps: string[];
    severity: ValidationSeverity;
}> = {
    FILE_SIZE_EXCEEDED: {
        message: (details) =>
            `File '${details.fileName}' (${details.fileSize}MB) exceeds the ${details.maxSize}MB size limit.`,
        resolutionSteps: [
            'Compress the PDF using Adobe Acrobat or online tools like SmallPDF',
            'Reduce image quality or resolution within the document',
            'Split the file into multiple smaller files if necessary',
            'Remove unnecessary embedded fonts or metadata',
        ],
        severity: 'error',
    },
    INVALID_FILE_FORMAT: {
        message: (details) =>
            `File '${details.fileName}' has an unsupported format '${details.fileFormat}'.`,
        resolutionSteps: [
            'Convert the file to an accepted format (see allowed formats)',
            'Use Microsoft Word or Google Docs to convert to PDF or DOCX',
            'For LaTeX files, ensure the extension is .tex or .latex',
            'Verify the file is not corrupted by opening it locally',
        ],
        severity: 'error',
    },
    INVALID_FILE_NAME: {
        message: (details) =>
            `File name '${details.fileName}' contains invalid characters.`,
        resolutionSteps: [
            'Rename the file using only letters, numbers, hyphens, and underscores',
            'Remove special characters like: @, #, $, %, &, *, (, ), [, ], {, }',
            'Avoid spaces in file names (use underscores or hyphens instead)',
            'Keep file names under 100 characters',
        ],
        severity: 'error',
    },
    MISSING_TITLE: {
        message: () =>
            'Paper title is required but missing.',
        resolutionSteps: [
            'Open the Paper Editor',
            'Enter a descriptive title for your paper',
            'Ensure the title is between 10 and 200 characters',
            'Save the changes before attempting submission',
        ],
        severity: 'error',
    },
    MISSING_ABSTRACT: {
        message: () =>
            'Abstract is required but missing.',
        resolutionSteps: [
            'Open the Paper Editor',
            'Add a 150-300 word abstract summarizing your research',
            'Include: background, methods, results, and conclusions',
            'Save the changes before attempting submission',
        ],
        severity: 'error',
    },
    MISSING_AUTHORS: {
        message: () =>
            'At least one author is required.',
        resolutionSteps: [
            'Open the Paper Editor',
            'Add author names in the Authors field',
            'Include full names with affiliations',
            'Separate multiple authors with commas',
        ],
        severity: 'error',
    },
    MISSING_KEYWORDS: {
        message: () =>
            'Keywords are required but missing.',
        resolutionSteps: [
            'Open the Paper Editor',
            'Add 3-6 relevant keywords describing your research',
            'Use standard terminology from your field',
            'Separate keywords with commas',
        ],
        severity: 'warning',
    },
    PLAGIARISM_THRESHOLD_EXCEEDED: {
        message: (details) =>
            `Similarity score (${details.similarityPercentage}%) exceeds the acceptable threshold (${details.threshold}%).`,
        resolutionSteps: [
            'Review the plagiarism report to identify matched sources',
            'Ensure all quoted text is properly cited',
            'Paraphrase content that shows high similarity',
            'Add proper citations and references for all sources',
            'Revise sections with high similarity scores',
            'Run the plagiarism check again after revisions',
        ],
        severity: 'error',
    },
    IMAGE_RESOLUTION_LOW: {
        message: (details) =>
            `Image '${details.fileName}' has insufficient resolution (${details.resolution}dpi). Minimum required: ${details.minResolution}dpi.`,
        resolutionSteps: [
            'Replace the image with a higher resolution version',
            'Ensure images are at least 300dpi for print quality',
            'Use vector formats (EPS, SVG) when possible',
            'Export images from source software at higher resolution',
        ],
        severity: 'warning',
    },
    IMAGE_FORMAT_INVALID: {
        message: (details) =>
            `Image '${details.fileName}' format '${details.format}' is not accepted.`,
        resolutionSteps: [
            'Convert image to PNG, JPEG, TIFF, or EPS format',
            'Use image editing software like Photoshop or GIMP',
            'Ensure color mode is RGB for digital or CMYK for print',
            'Maintain original quality during conversion',
        ],
        severity: 'error',
    },
    CITATION_FORMAT_INVALID: {
        message: (details) =>
            `Citations do not match the required format: ${details.requiredFormat}.`,
        resolutionSteps: [
            'Use a reference management tool (Zotero, Mendeley, EndNote)',
            'Select the required citation style',
            'Update all in-text citations to match the style',
            'Regenerate the bibliography in the correct format',
        ],
        severity: 'warning',
    },
    MISSING_MANUSCRIPT_FILE: {
        message: () =>
            'Manuscript file is required but not uploaded.',
        resolutionSteps: [
            'Upload your manuscript file in PDF, DOCX, or LaTeX format',
            'Ensure the file is complete and properly formatted',
            'Verify the file opens correctly before uploading',
            'Check that all figures and tables are included',
        ],
        severity: 'error',
    },
};

// Validation functions
export function validateFileSize(
    fileName: string,
    fileSize: number,
    fileType: 'PAPER' | 'SUPPLEMENTARY' | 'IMAGE'
): { valid: boolean; error?: Partial<ValidationError> } {
    const maxSize = FILE_SIZE_LIMITS[fileType];
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);

    if (fileSize > maxSize) {
        const errorConfig = ERROR_MESSAGES.FILE_SIZE_EXCEEDED;
        return {
            valid: false,
            error: {
                error_type: 'file_size',
                error_code: 'FILE_SIZE_EXCEEDED',
                file_name: fileName,
                error_message: errorConfig.message({ fileName, fileSize: fileSizeMB, maxSize: maxSizeMB }),
                resolution_steps: errorConfig.resolutionSteps,
                severity: errorConfig.severity,
            },
        };
    }

    return { valid: true };
}

export function validateFileFormat(
    fileName: string,
    fileType: 'PAPER' | 'SUPPLEMENTARY' | 'IMAGE'
): { valid: boolean; error?: Partial<ValidationError> } {
    const allowedFormats = ALLOWED_FORMATS[fileType];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!allowedFormats.includes(fileExtension)) {
        const errorConfig = ERROR_MESSAGES.INVALID_FILE_FORMAT;
        return {
            valid: false,
            error: {
                error_type: 'file_format',
                error_code: 'INVALID_FILE_FORMAT',
                file_name: fileName,
                error_message: errorConfig.message({
                    fileName,
                    fileFormat: fileExtension,
                    allowedFormats: allowedFormats.join(', '),
                }),
                resolution_steps: errorConfig.resolutionSteps,
                severity: errorConfig.severity,
            },
        };
    }

    return { valid: true };
}

export function validateFileName(fileName: string): { valid: boolean; error?: Partial<ValidationError> } {
    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9._-]/;

    if (invalidChars.test(fileName.replace(/\.[^.]+$/, ''))) {
        const errorConfig = ERROR_MESSAGES.INVALID_FILE_NAME;
        return {
            valid: false,
            error: {
                error_type: 'file_naming',
                error_code: 'INVALID_FILE_NAME',
                file_name: fileName,
                error_message: errorConfig.message({ fileName }),
                resolution_steps: errorConfig.resolutionSteps,
                severity: errorConfig.severity,
            },
        };
    }

    // Check file name length
    if (fileName.length > 100) {
        return {
            valid: false,
            error: {
                error_type: 'file_naming',
                error_code: 'FILE_NAME_TOO_LONG',
                file_name: fileName,
                error_message: `File name '${fileName}' is too long (${fileName.length} characters). Maximum: 100 characters.`,
                resolution_steps: [
                    'Shorten the file name to under 100 characters',
                    'Use abbreviations where appropriate',
                    'Remove unnecessary words or version numbers',
                ],
                severity: 'error',
            },
        };
    }

    return { valid: true };
}

export function validateMetadata(paper: {
    title?: string | null;
    abstract?: string | null;
    authors?: string[] | null;
    keywords?: string[] | null;
}): { valid: boolean; errors: Partial<ValidationError>[] } {
    const errors: Partial<ValidationError>[] = [];

    // Validate title
    if (!paper.title || paper.title.trim().length === 0) {
        const errorConfig = ERROR_MESSAGES.MISSING_TITLE;
        errors.push({
            error_type: 'missing_metadata',
            error_code: 'MISSING_TITLE',
            field_name: 'title',
            error_message: errorConfig.message({}),
            resolution_steps: errorConfig.resolutionSteps,
            severity: errorConfig.severity,
        });
    }

    // Validate abstract
    if (!paper.abstract || paper.abstract.trim().length === 0) {
        const errorConfig = ERROR_MESSAGES.MISSING_ABSTRACT;
        errors.push({
            error_type: 'missing_metadata',
            error_code: 'MISSING_ABSTRACT',
            field_name: 'abstract',
            error_message: errorConfig.message({}),
            resolution_steps: errorConfig.resolutionSteps,
            severity: errorConfig.severity,
        });
    }

    // Validate authors
    if (!paper.authors || paper.authors.length === 0) {
        const errorConfig = ERROR_MESSAGES.MISSING_AUTHORS;
        errors.push({
            error_type: 'missing_metadata',
            error_code: 'MISSING_AUTHORS',
            field_name: 'authors',
            error_message: errorConfig.message({}),
            resolution_steps: errorConfig.resolutionSteps,
            severity: errorConfig.severity,
        });
    }

    // Validate keywords (warning only)
    if (!paper.keywords || paper.keywords.length === 0) {
        const errorConfig = ERROR_MESSAGES.MISSING_KEYWORDS;
        errors.push({
            error_type: 'missing_metadata',
            error_code: 'MISSING_KEYWORDS',
            field_name: 'keywords',
            error_message: errorConfig.message({}),
            resolution_steps: errorConfig.resolutionSteps,
            severity: errorConfig.severity,
        });
    }

    return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
    };
}

export function validatePlagiarismScore(
    similarityPercentage: number,
    threshold: number = 25
): { valid: boolean; error?: Partial<ValidationError> } {
    if (similarityPercentage > threshold) {
        const errorConfig = ERROR_MESSAGES.PLAGIARISM_THRESHOLD_EXCEEDED;
        return {
            valid: false,
            error: {
                error_type: 'plagiarism_threshold',
                error_code: 'PLAGIARISM_THRESHOLD_EXCEEDED',
                error_message: errorConfig.message({ similarityPercentage, threshold }),
                resolution_steps: errorConfig.resolutionSteps,
                severity: errorConfig.severity,
            },
        };
    }

    return { valid: true };
}

// Format file size for display
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get severity color for UI
export function getSeverityColor(severity: ValidationSeverity): string {
    switch (severity) {
        case 'error':
            return 'text-destructive';
        case 'warning':
            return 'text-yellow-600';
        case 'info':
            return 'text-blue-600';
        default:
            return 'text-muted-foreground';
    }
}

// Get severity icon
export function getSeverityIcon(severity: ValidationSeverity): string {
    switch (severity) {
        case 'error':
            return '❌';
        case 'warning':
            return '⚠️';
        case 'info':
            return 'ℹ️';
        default:
            return '•';
    }
}
