const bcrypt = require('bcrypt');
const pass = '182011';
const hash = '$2b$10$BRtLlL10t08VpANbSFRWZenx9V8oM1nn/NF.jYsoRaCHG1U3iddra';
console.log('Result:', bcrypt.compareSync(pass, hash));
