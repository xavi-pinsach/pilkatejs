import {kzgProve} from "../../src/services/kzg_services.js";

export const command = 'proof'
export const desc = '...'
export const builder = (yargs) => yargs
    .positional('pilFilename', {
        describe: 'PIL filename', type: 'string', default: 'state_machine.pil'
    })
    .positional('cnstPolsFilename', {
        describe: 'Constant polynomials filename', type: 'string', default: 'polynomial.cnst'
    })
    .positional('cmmtPolsFilename', {
        describe: 'Committed polynomials filename', type: 'string', default: 'polynomial.cnst'
    })
    .positional('ptauFilename', {
        describe: 'Ptau filename', type: 'string', default: 'powersOfTau.ptau'
    })
    .positional('publicFilename', {
        describe: 'Public inputs filename', type: 'string', default: 'public.json'
    })
    .positional('proofFilename', {
        describe: 'Proof filename', type: 'string', default: 'proof.json'
    })
    .options({
        pilConfigFilename: {
            alias: 'c', type: 'string', description: 'PIL config filename'
        }
    });
export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    await kzgProve(argv.pilFilename, argv.pilConfigFilename, argv.cnstPolsFilename, argv.cmmtPolsFilename, argv.ptauFilename, argv.publicFilename, argv.proofFilename, options);
}