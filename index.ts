export interface ServiceError {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
}