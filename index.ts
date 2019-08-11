import HttpStatus from 'http-status-codes';

export class ServiceError extends Error {
    public timestamp: string;
    public error: string;

    constructor(
        public status: number,
        public message: string,
        public path: string
    ) {
        super(message);
        this.error = HttpStatus.getStatusText(status)
        this.timestamp = new Date().toISOString();
    }
}