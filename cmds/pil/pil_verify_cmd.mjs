import {pilVerify} from "../../src/services/pil_services.js";
import {resolve} from "path";

export const command = 'verify <pilFilename> <cnstPolsFilename> <cmmtPolsFilename> [options]'
export const desc = 'Check if constant polynomials and committed polynomials fit with the PIL program'
export const builder = (yargs) => yargs
    .positional('pilFilename', {
        describe: 'PIL filename', type: 'string', default: 'state_machine.pil'
    })
    .positional('cnstPolsFilename', {
        describe: 'Constant polynomials filename', type: 'string', default: 'polynomial.cnst'
    })
    .positional('cmmtPolsFilename', {
        describe: 'Committed polynomials filename', type: 'string', default: 'polynomial.cmmt'
    })
    .options({
        pilConfigFilename: {
            alias: 'c', type: 'string', description: 'PIL config filename'
        }
    });

export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    argv.pilFilename = resolve(argv.pilFilename);
    if (undefined !== argv.pilConfigFilename) argv.pilConfigFilename = resolve(argv.pilConfigFilename);
    argv.cnstPolsFilename = resolve(argv.cnstPolsFilename);
    argv.cmmtPolsFilename = resolve(argv.cmmtPolsFilename);

    await pilVerify(argv.pilFilename, argv.pilConfigFilename, argv.cnstPolsFilename, argv.cmmtPolsFilename, options);
}