import {pilBuildCommitted} from "../../src/services/pil_services.js";

export const command = 'committed <pilFilename> <smFilename> <smInputs> <outputFilename> [options]'
export const desc = 'Build all the constant polynomials defined in the PIL program using the builder'
export const builder = (yargs) => yargs
    .positional('pilFilename', {
        describe: 'PIL filename', type: 'string', default: 'state_machine.pil'
    })
    .positional('smFilename', {
        describe: 'State machine builder filename', type: 'string', default: 'state_machine_builder.js'
    })
    .positional('smInputs', {
        describe: 'State machine inputs', type: 'string', default: 'state_machine_input.json'
    })
    .positional('outputFilename', {
        describe: 'Output filename', type: 'string', default: 'polynomial.cmmt'
    })
    .options({
        pilConfigFilename: {
            alias: 'c', type: 'string', description: 'PIL config filename'
        }
    });
export const handler = async function (argv) {
    const options = {verbose: argv.verbose || false};

    await pilBuildCommitted(argv.pilFilename, argv.pilConfigFilename, argv.smFilename, argv.smInputs, argv.outputFilename, options);
}