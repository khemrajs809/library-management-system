const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDirectory = path.join(__dirname, '../../logs');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (Object.keys(meta).length) {
            logMessage += ` | ${JSON.stringify(meta)}`;
        }
        if (stack) {
            logMessage += `\nStack Trace:\n${stack}`;
        }
        return logMessage;
    })
);

// Create the logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'lms-backend' },
    transports: [
        // 1. Console Output (Colorized for local dev)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        
        // 2. Daily Rotating General Logs (14 day retention)
        new DailyRotateFile({
            filename: path.join(logDirectory, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info'
        }),

        // 3. Daily Rotating Error Logs (14 day retention)
        new DailyRotateFile({
            filename: path.join(logDirectory, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error'
        })
    ],
    // Catch unhandled exceptions and promise rejections
    exceptionHandlers: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat)
        }),
        new DailyRotateFile({
            filename: path.join(logDirectory, 'fatal-exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ],
    rejectionHandlers: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat)
        }),
        new DailyRotateFile({
            filename: path.join(logDirectory, 'fatal-rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ]
});

module.exports = logger;
