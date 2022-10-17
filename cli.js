import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {commands} from "./cmds/index.mjs";

yargs(hideBin(process.argv))
    .command(commands)
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    })
    .demandCommand()
    .help()
    .parse();