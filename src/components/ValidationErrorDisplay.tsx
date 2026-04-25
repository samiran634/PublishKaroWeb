import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, FileWarning } from 'lucide-react';
import type { ValidationError } from '@/types/types';
import { getSeverityColor, getSeverityIcon } from '@/lib/validation';

interface ValidationErrorDisplayProps {
    errors: ValidationError[];
    onResolve?: (errorId: string) => void;
    showResolutionSteps?: boolean;
}

export default function ValidationErrorDisplay({
    errors,
    onResolve,
    showResolutionSteps = true
}: ValidationErrorDisplayProps) {
    if (errors.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="flex items-center gap-3 py-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                        <div className="font-medium text-green-900">All validations passed</div>
                        <div className="text-sm text-green-700">Your submission is ready to proceed</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    const infoCount = errors.filter(e => e.severity === 'info').length;

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'error':
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'info':
                return <Info className="h-5 w-5 text-blue-600" />;
            default:
                return <FileWarning className="h-5 w-5" />;
        }
    };

    const getAlertVariant = (severity: string): 'default' | 'destructive' => {
        return severity === 'error' ? 'destructive' : 'default';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <FileWarning className="h-5 w-5" />
                            Validation Results
                        </CardTitle>
                        <CardDescription>
                            {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''}`}
                            {errorCount > 0 && warningCount > 0 && ', '}
                            {warningCount > 0 && `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                            {(errorCount > 0 || warningCount > 0) && infoCount > 0 && ', '}
                            {infoCount > 0 && `${infoCount} info`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {errorCount > 0 && <Badge variant="destructive">{errorCount} Errors</Badge>}
                        {warningCount > 0 && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{warningCount} Warnings</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {errorCount > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Submission Blocked</AlertTitle>
                        <AlertDescription>
                            You must resolve all errors before proceeding with submission. Warnings are optional but recommended to address.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-3">
                    {errors.map((error, index) => (
                        <Card key={error.id || index} className={`${error.severity === 'error' ? 'border-destructive' : ''}`}>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    {getIcon(error.severity)}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="font-medium">{error.error_message}</div>
                                                {error.file_name && (
                                                    <div className="text-sm text-muted-foreground">
                                                        File: <span className="font-mono">{error.file_name}</span>
                                                    </div>
                                                )}
                                                {error.field_name && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Field: <span className="font-mono">{error.field_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant={error.severity === 'error' ? 'destructive' : 'outline'}>
                                                {error.error_code}
                                            </Badge>
                                        </div>

                                        {showResolutionSteps && error.resolution_steps && error.resolution_steps.length > 0 && (
                                            <>
                                                <Separator />
                                                <div className="space-y-2">
                                                    <div className="text-sm font-medium">How to fix:</div>
                                                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                                        {error.resolution_steps.map((step, stepIndex) => (
                                                            <li key={stepIndex} className="pl-2">{step}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </>
                                        )}

                                        {onResolve && !error.is_resolved && (
                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onResolve(error.id)}
                                                >
                                                    Mark as Resolved
                                                </Button>
                                            </div>
                                        )}

                                        {error.is_resolved && error.resolved_at && (
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Resolved on {new Date(error.resolved_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
