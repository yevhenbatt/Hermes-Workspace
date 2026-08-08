#!/usr/bin/env tsx

import { Command } from 'commander';

import { registerCommands } from './core/register-commands';

function main(): void {
    const program = new Command();

    registerCommands(program);

    program.parse();
}

main();