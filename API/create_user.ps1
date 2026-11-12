param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9._-]{3,80}$')]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [ValidateLength(1, 150)]
  [string]$FullName,

  [Parameter(Mandatory = $true)]
  [ValidateSet('admin', 'pharmacist')]
  [string]$Role
)

$ErrorActionPreference = 'Stop'
$php = 'C:\Program Files\XAMPP\php\php.exe'
$creator = Join-Path $PSScriptRoot 'create_account.php'

if (-not (Test-Path $php)) {
  throw "PHP was not found at $php."
}
if (-not (Test-Path $creator)) {
  throw "The PHP account-creation helper was not found at $creator."
}

$passwordSecure = Read-Host 'Password (minimum 8 characters)' -AsSecureString
$confirmationSecure = Read-Host 'Confirm password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
$confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmationSecure)

try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)

  if ($password.Length -lt 8) {
    throw 'Password must be at least 8 characters.'
  }
  if ($password -cne $confirmation) {
    throw 'Passwords do not match.'
  }

  @($password, $confirmation) | & $php $creator $Username $FullName $Role
  if ($LASTEXITCODE -ne 0) {
    throw 'The PHP user creation command failed.'
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer)
  $passwordSecure.Dispose()
  $confirmationSecure.Dispose()
  $password = $null
  $confirmation = $null
}
