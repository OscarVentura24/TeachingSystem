<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class DatabaseRestoreCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:restore {file? : The backup file or filename to restore (defaults to most recent)} {--force : Force restore without interactive confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restore database from an SQL backup file';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $connection = config('database.default');
        $dbConfig = config("database.connections.{$connection}");

        $backupDir = database_path('backups');
        if (! File::exists($backupDir)) {
            $this->error("Backup directory does not exist: {$backupDir}");
            return Command::FAILURE;
        }

        $specifiedFile = $this->argument('file');

        if ($specifiedFile) {
            $filePath = File::exists($specifiedFile)
                ? $specifiedFile
                : "{$backupDir}/{$specifiedFile}";
        } else {
            // Find most recent backup
            $files = collect(File::files($backupDir))
                ->filter(fn ($f) => in_array($f->getExtension(), ['sql', 'sqlite']))
                ->sortByDesc(fn ($f) => $f->getMTime())
                ->values();

            if ($files->isEmpty()) {
                $this->error("No backup files found in {$backupDir}");
                return Command::FAILURE;
            }

            $filePath = $files->first()->getPathname();
        }

        if (! File::exists($filePath)) {
            $this->error("Backup file not found: {$filePath}");
            return Command::FAILURE;
        }

        $filename = basename($filePath);
        $this->warn("About to restore database from backup: {$filename}");

        if (! $this->option('force')) {
            if (! $this->confirm('This will overwrite current database records. Do you wish to continue?', false)) {
                $this->info('Restore aborted.');
                return Command::SUCCESS;
            }
        }

        if ($connection === 'sqlite') {
            $dbPath = $dbConfig['database'];
            File::copy($filePath, $dbPath);
            $this->info("SQLite database restored from {$filename}!");
            return Command::SUCCESS;
        }

        if ($connection === 'pgsql') {
            $host = $dbConfig['host'] ?? '127.0.0.1';
            $port = $dbConfig['port'] ?? 5432;
            $database = $dbConfig['database'];
            $username = $dbConfig['username'];
            $password = $dbConfig['password'] ?? '';

            $psqlPath = $this->findBinary(['/opt/homebrew/bin/psql', '/usr/local/bin/psql', 'psql']);

            $command = [
                $psqlPath,
                '-h', $host,
                '-p', (string) $port,
                '-U', $username,
                '-d', $database,
                '-f', $filePath,
            ];

            $process = new Process($command);
            if (! empty($password)) {
                $process->setEnv(['PGPASSWORD' => $password]);
            }
            $process->setTimeout(300);

            $this->info("Restoring database from {$filename}...");
            $process->run();

            if (! $process->isSuccessful()) {
                $this->error('Failed to restore database: ' . $process->getErrorOutput());
                return Command::FAILURE;
            }

            $this->info("Database successfully restored from: {$filename}");
            return Command::SUCCESS;
        }

        $this->error("Database driver '{$connection}' is not currently configured for automated restore.");
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

        return 'psql';
    }
}
