import * as pil_build_constant from "./pil_build_constant_cmd.mjs"
import * as pil_build_committed from "./pil_build_committed_cmd.mjs"
import * as pil_verify from "./pil_verify_cmd.mjs";

export const command = 'build'
export const desc = '...'
export const builder = (yargs) => yargs.command([pil_build_constant, pil_build_committed, pil_verify])
export const handler = function (argv) {
    console.log('adding remote %s at url %s', argv.name, argv.url)
}