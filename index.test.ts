import { NextFunction, Request, Response } from 'express';
import {
    ServiceError,
    handleNotFound,
    handleRemainingErrors,
    translateServiceErrors,
} from './';

import log4js from '@log4js-node/log4js-api';

jest.mock('@log4js-node/log4js-api', () => {
    // using the mock factory we mimic the library.

    // this mock function is outside the mockImplementation
    // because we want to check the same mock in every test,
    // not create a new one mock every log4js.getLogger()
    const warn = jest.fn();
    const error = jest.fn();
    return {
        getLogger: jest.fn(() => ({
            level: jest.fn(),
            warn,
            error,
        })),
    };
});

describe('handleNotFound', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            json: jest.fn(),
        };
        nextFunction = jest.fn();
    });

    it('should call next function with ServiceError(404)', () => {
        const url = `test`;
        const expectedException = new ServiceError(404, `${url} not found.`);
        mockRequest = { url };
        handleNotFound()(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toBeCalledWith(expectedException);
    });
});

describe('handleRemainingErrors', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            json: jest.fn(),
        };
        nextFunction = jest.fn();
    });

    it('should pass ServiceError to nextFunction', () => {
        let error = new ServiceError(418, `I'm a teapot`, new Error().stack);
        handleRemainingErrors()(
            error,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toBeCalledWith(error);
    });
    it('should build and pass ServiceError to nextFunction from Error class', () => {
        const message = 'whoops';
        const stackTrace = 'stack_trace';
        let error = new Error(message);
        error.stack = stackTrace;
        let expectedError = new ServiceError(500, message, stackTrace);
        handleRemainingErrors()(
            error,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toBeCalledWith(expectedError);
    });
    it('should build and pass ServiceError to nextFunction from other error', () => {
        const nonStandardError = { asdf: 'asdf' };
        let expectedError = new ServiceError(
            500,
            JSON.stringify(nonStandardError),
            null
        );
        handleRemainingErrors()(
            nonStandardError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toBeCalledWith(expectedError);
    });
});

describe('translateServiceErrors', () => {
    let path = '/test';
    let mockRequest: Partial<Request> = { path };
    let send = jest.fn();
    let mockResponse: Partial<Response> = {
        //@ts-ignore
        status: jest.fn(() => ({ send })),
    };

    beforeEach(() => {
        jest.resetModules();
        path = '/test';
        mockRequest = { path };
        send = jest.fn();
        mockResponse = {
            //@ts-ignore
            status: jest.fn(() => ({ send })),
        };
    });

    it('should add path, log warn, and send response', () => {
        const message = 'test';
        const code = 400;
        const error = new ServiceError(code, message);
        const expectedError = new ServiceError(code, message);
        expectedError.path = path;

        translateServiceErrors()(
            error,
            mockRequest as Request,
            mockResponse as Response
        );

        expect(mockResponse.status).toBeCalledWith(code);
        expect(send).toBeCalledWith(expectedError);
        expect(log4js.getLogger().warn).toBeCalledWith(message);
    });

    it('should log error', () => {
        const message = 'test';
        const code = 500;
        const stack = 'stack';
        const error = new ServiceError(code, message, stack);

        translateServiceErrors()(
            error,
            mockRequest as Request,
            mockResponse as Response
        );

        expect(log4js.getLogger().error).toBeCalledWith(message, stack);
    });
});
