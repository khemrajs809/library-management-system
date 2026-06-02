const toCamelCase = (str) => {
    return str.replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());
};

const toSnakeCase = (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const isPlainObject = (obj) => {
    return obj !== null && typeof obj === 'object' && obj.constructor === Object;
};

const convertKeys = (obj, converter) => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    } else if (isPlainObject(obj)) {
        return Object.keys(obj).reduce((result, key) => {
            // Check if key is something like _id (don't break mongo style ids if any exist, though this is MariaDB)
            // But we specifically want to convert member_id to memberId
            const newKey = converter(key);
            result[newKey] = convertKeys(obj[key], converter);
            return result;
        }, {});
    }
    return obj;
};

const caseConverter = (req, res, next) => {
    // 1. Convert incoming requests from camelCase to snake_case
    if (req.body && isPlainObject(req.body)) {
        req.body = convertKeys(req.body, toSnakeCase);
    }
    if (req.query && isPlainObject(req.query)) {
        req.query = convertKeys(req.query, toSnakeCase);
    }

    // 2. Intercept outgoing responses to convert snake_case to camelCase
    const originalJson = res.json;
    res.json = function(body) {
        // Prevent double conversion if json() is called multiple times internally
        if (!this._jsonConverted) {
            this._jsonConverted = true;
            body = convertKeys(body, toCamelCase);
        }
        return originalJson.call(this, body);
    };

    next();
};

module.exports = caseConverter;
