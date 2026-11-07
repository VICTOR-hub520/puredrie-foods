$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
  $psqlPath = $psql.Source
} else {
  $postgresDirectory = Join-Path $env:ProgramFiles "PostgreSQL"
  $installedPsql = Get-ChildItem -Path $postgresDirectory -Filter psql.exe -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if (-not $installedPsql) {
    throw "Could not find psql.exe. Install PostgreSQL command-line tools or add psql.exe to PATH."
  }
  $psqlPath = $installedPsql.FullName
}

$sqlFile = Join-Path $PSScriptRoot "setup-local-database.sql"
& $psqlPath -h localhost -U postgres -W -d postgres -f $sqlFile
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
