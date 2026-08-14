param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $Executable,

  [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
  [string[]] $CommandArguments
)

& $Executable @CommandArguments
exit $LASTEXITCODE
