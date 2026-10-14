<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class DatabaseBackupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup {--name= : Optional suffix for the backup file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a full SQL backup of the current database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $connection = config('database.default');
        $dbConfig = config("database.connections.{$connection}");

        $backupDir = database_path('backups');
        if (! File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $timestamp = now()->format('Y-m-d_H-i-s');
        $customName = $this->option('name') ? '_' . str_replace([' ', '/', '\\'], '_', $this->option('name')) : '';
        $filename = "backup_{$timestamp}{$customName}.sql";
        $filePath = "{$backupDir}/{$filename}";

        $this->info("Creating database backup: {$filename}...");

        if ($connection === 'sqlite') {
            $dbPath = $dbConfig['database'];
            File::copy($dbPath, $filePath);
            $this->info("SQLite database copied to: {$filePath}");
            return Command::SUCCESS;
        }

        if ($connection === 'pgsql') {
            $host = $dbConfig['host'] ?? '127.0.0.1';
            $port = $dbConfig['port'] ?? 5432;
            $database = $dbConfig['database'];
            $username = $dbConfig['username'];
            $password = $dbConfig['password'] ?? '';

            $pgDumpPath = $this->findBinary(['/opt/homebrew/bin/pg_dump', '/usr/local/bin/pg_dump', 'pg_dump']);

            $command = [
                $pgDumpPath,
                '-h', $host,
                '-p', (string) $port,
                '-U', $username,
                '-d', $database,
                '--clean',
                '--if-exists',
                '--no-owner',
                '--no-privileges',
                '-f', $filePath,
            ];

            $process = new Process($command);
            if (! empty($password)) {
                $process->setEnv(['PGPASSWORD' => $password]);
            }
            $process->setTimeout(300);

            $process->run();

            if (! $process->isSuccessful()) {
                $this->error('Failed to create database backup: ' . $process->getErrorOutput());
                return Command::FAILURE;
            }

            $sizeInKb = round(File::size($filePath) / 1024, 2);
            $this->info("Backup successfully generated!");
            $this->line("File: <comment>{$filePath}</comment> ({$sizeInKb} KB)");
            $this->line("To restore this backup, run: <info>php artisan db:restore {$filename}</info>");

            return Command::SUCCESS;
        }

        $this->error("Database driver '{$connection}' is not currently configured for automated backups.");
        return Command::FAILURE;
    }

    /**
     * Locate binary path.
     *
     * @param array<string> $candidates
     * @return string
     */
    protected function findBinary(array $candidates): string
    {
        foreach ($candidates as $candidate) {
            if (File::exists($candidate) && is_executable($candidate)) {
                return $candidate;
            }
        }

        return 'pg_dump';
    }
}
