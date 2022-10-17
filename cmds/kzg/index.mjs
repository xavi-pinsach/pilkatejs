import * as kzgSetup from "./kzg_setup_cmd.mjs"
import * as kzgProof from "./kzg_proof_cmd.mjs"
import * as kzgVerify from "./kzg_verify_cmd.mjs"

export const command = 'kzg <subcommand>'
export const desc = 'KZG (Kate, Zaverucha & Goldberg) Polynomial commitments commands'
export const builder = (yargs) => yargs.command([kzgSetup, kzgProof, kzgVerify])
export const handler = function (argv) {
    console.log('adding remote %s at url %s', argv.name, argv.url)
}