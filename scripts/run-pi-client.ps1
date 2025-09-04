Param(
  [string]$ServerUrl = 'ws://192.168.68.67:8080',
  [string]$FamilyCode = '',
  [int]$TotalValves = 2,
  [int]$TotalSensors = 2,
  [switch]$Simulation = $true
)

# Resolve repo root (one directory up from this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "Repo root: $RepoRoot"
Set-Location $RepoRoot

# Ensure Python venv exists and get its python executable
$venvPath = Join-Path $RepoRoot '.venv'
$venvPython = Join-Path $venvPath 'Scripts/python.exe'

if (-not (Test-Path $venvPython)) {
  Write-Host 'Creating virtual environment (.venv)...'
  python -m venv $venvPath
}

if (-not (Test-Path $venvPython)) {
  Write-Error 'Virtual environment python not found. Ensure Python is installed and in PATH.'
  exit 1
}

# Upgrade pip and install dependencies
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $RepoRoot 'controller/requirements.txt')

# Ensure required runtime deps not in requirements
& $venvPython -m pip install pydantic schedule requests pymodbus pyserial python-dotenv | Out-Null

# Set environment variables for this session
$env:SMART_GARDEN_SERVER_URL = $ServerUrl
$env:SMART_GARDEN_FAMILY_CODE = $FamilyCode
$env:SMART_GARDEN_TOTAL_VALVES = "$TotalValves"
$env:SMART_GARDEN_TOTAL_SENSORS = "$TotalSensors"
$env:SMART_GARDEN_SIMULATION_MODE = $(if ($Simulation) { 'true' } else { 'false' })

Write-Host "Starting Smart Garden Pi Client..."
Write-Host "  Server URL: $ServerUrl"
Write-Host "  Family Code: $FamilyCode"
Write-Host "  Valves: $TotalValves  Sensors: $TotalSensors"
Write-Host "  Simulation Mode: $($env:SMART_GARDEN_SIMULATION_MODE)"

# Run the client
& $venvPython (Join-Path $RepoRoot 'start_pi_client.py')


