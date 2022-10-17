import {kzgSetup} from "../../src/services/kzg_services.js";

export const command = 'setup <pilFilename> <cnstPolsFilename> <ptauFilename> <preprocessedFilename>'
export const desc = '...' //TODO
export const builder = (yargs) => yargs
    .positional('pilFilename', {
        describe: 'PIL filename', type: 'string', default: 'state_machine.pil'
    })
    .positional('cnstPolsFilename', {
        describe: 'Constant polynomials filename', type: 'string', default: 'polynomial.cnst'
    })
    .positional('ptauFilename', {
        describe: 'Ptau filename', type: 'string', default: 'powersOfTau.ptau'
    })
    .positional('preprocessedFilename', {
        describe: 'Output preprocessed filename', type: 'string', default: 'preprocessed.json'
    })
    .options({
        pilConfigFilename: {
            alias: 'c', type: 'string', description: 'PIL config filename'
        }
    });
export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    await kzgSetup(argv.pilFilename, argv.pilConfigFilename, argv.cnstPolsFilename, argv.ptauFilename, argv.preprocessedFilename, options);
}