export class ServiceError extends Error {

    constructor(
        public timestamp: string,
        public status: number,
        public error: string,
        public message: string,
        public path: string
    ) {
        super(message);
    }
}