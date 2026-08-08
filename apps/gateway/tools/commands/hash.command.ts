import { Command } from 'commander';
import * as argon2 from 'argon2';

export function createHashCommand(): Command {
    return new Command('hash')
        .description('Generate an Argon2id password hash')
        .argument('<password>', 'Password to hash')
        .action(async (password: string) => {
            const hash = await argon2.hash(password);

            console.log();
            console.log('Password:');
            console.log(password);
            console.log();

            console.log('Hash:');
            console.log(hash);
            console.log();
        });
}