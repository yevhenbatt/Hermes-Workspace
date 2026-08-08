import { Command } from 'commander';
import { createHashCommand } from '../commands/hash.command';

export function registerCommands(program: Command): void {
    program
        .name('hermes')
        .description('Hermes Workspace CLI')
        .version('0.1.0');

    program.addCommand(createHashCommand());
}