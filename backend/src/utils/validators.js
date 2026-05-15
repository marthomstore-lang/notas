"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRUT = void 0;
const validateRUT = (rut) => {
    if (!rut || !/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rut))
        return false;
    const [body, dv] = rut.split('-');
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body.charAt(i), 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const expectedDv = 11 - (sum % 11);
    const calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'k' : expectedDv.toString();
    return calculatedDv.toLowerCase() === dv.toLowerCase();
};
exports.validateRUT = validateRUT;
