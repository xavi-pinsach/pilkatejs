import {kzgVerify} from "../../src/services/kzg_services.js";
import {resolve} from "path";

export const command = 'verify <preprocessedFilename> <publicFilename> <proofFilename>'
export const desc = '...'
export const builder = (yargs) => yargs
    .positional('preprocessedFilename', {
        describe: 'Preprocessed filename', type: 'string', default: 'preprocessed.json'
    })
    .positional('publicFilename', {
        describe: 'Public inputs filename', type: 'string', default: 'public.json'
    })
    .positional('proofFilename', {
        describe: 'Proof filename', type: 'string', default: 'proof.json'
    });

export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    argv.preprocessedFilename = resolve(argv.preprocessedFilename);
    argv.publicFilename = resolve(argv.publicFilename);
    argv.proofFilename = resolve(argv.proofFilename);

    await kzgVerify(argv.preprocessedFilename, argv.publicFilename, argv.proofFilename, options);
}