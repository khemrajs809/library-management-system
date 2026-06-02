/**
 * Sanitizes a string for CSV safety to prevent CSV Injection (Formula Injection).
 * Removes or escapes characters that could be interpreted as formulas in Excel/Calc.
 */
const sanitizeCsvField = (value) => {
    if (typeof value !== 'string') return value;
    if (value.length === 0) return value;

    // Common formula triggers: =, +, -, @, \t, \r
    const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
    
    if (formulaTriggers.some(trigger => value.startsWith(trigger))) {
        // Prepend a single quote to escape the formula
        return `'${value}`;
    }
    
    return value;
};

const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeCsvField(value);
    }
    return sanitized;
};

module.exports = { sanitizeCsvField, sanitizeObject };
