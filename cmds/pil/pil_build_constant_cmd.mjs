import {pilBuildConstant} from "../../src/services/pil_services.js";

export const command = 'constant <pilFilename> <smFilename> <outputFilename> [options]'
export const desc = 'Build all the constant polynomials defined in the PIL program using the builder'
export const builder = (yargs) => yargs
    .positional('pilFilename', {
        describe: 'PIL filename', type: 'string', default: 'state_machine.pil'
    })
    .positional('smFilename', {
        describe: 'State machine builder filename', type: 'string', default: 'state_machine_builder.js'
    })
    .positional('outputFilename', {
        describe: 'Output filename', type: 'string', default: 'polynomial.cnst'
    })
    .options('pilConfigFilename', {
        alias: 'c', type: 'string', description: 'PIL config filename'
    });
export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    await pilBuildConstant(argv.pilFilename, argv.pilConfigFilename, argv.smFilename, argv.outputFilename, options);
}