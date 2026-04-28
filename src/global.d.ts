// global types
/// <reference types="bmapgl" />

interface ElectronEmbedBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ElectronEmbedStatus {
    status: 'idle' | 'loading' | 'loaded' | 'error' | 'destroyed';
    url?: string;
    error?: string;
}

interface ElectronPortalUploadResult {
    success: boolean;
    reason?: string;
    fileName?: string;
}

interface Window {
    electronAPI?: {
        startSubmission: (data: unknown) => void;
        onSubmissionProgress: (callback: (data: unknown) => void) => void;
        cancelSubmission: () => void;
        embedWebContents: (url: string, bounds: ElectronEmbedBounds) => void;
        destroyWebContents: () => void;
        resizeWebContents: (bounds: ElectronEmbedBounds) => void;
        onWebContentsStatus: (callback: (data: ElectronEmbedStatus) => void) => void;
        removeWebContentsStatusListener: () => void;
        pickLocalPdf: () => Promise<string | null>;
        attachFileToPortalInput: (webContentsId: number, filePath: string) => Promise<ElectronPortalUploadResult>;
        on: (channel: string, callback: (data: unknown) => void) => void;
    };
}

interface WebviewTagElement extends HTMLElement {
    executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
    getURL?: () => string;
    getWebContentsId?: () => number;
    reload?: () => void;
}

declare namespace JSX {
    interface IntrinsicElements {
        webview: any;
    }
}
