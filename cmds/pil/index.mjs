import * as pil_build from "./pil_build_cmd.mjs"
import * as pil_verify from "./pil_verify_cmd.mjs"

export const command = 'pil <subcommand>'
export const desc = ''
export const builder = (yargs) => yargs.command([pil_build, pil_verify])
export const handler = function (argv) {
    console.log('adding remote %s at url %s', argv.name, argv.url)
}