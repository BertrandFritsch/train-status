$CAPACITY_OF_TRAIN = 2000

function readDays() {
  $days = (Get-Content ./days.json) -join '' | ConvertFrom-Json

  $maxDayWeight = ($days | Measure-Object -Maximum weight).Maximum

  return $days | ForEach-Object -Begin { $a = @() } { $a += ($_.weight / $maxDayWeight) } -End { $a }
}

function readTimes() {
  $times = (Get-Content ./times.json) -join '' | ConvertFrom-Json
  
  $maxTimeWeight = ($times | Measure-Object -Maximum weight).Maximum

  return $times | ForEach-Object { [PSCustomObject] @{ time=$_.time; weight=$_.weight / $maxTimeWeight } }
}

function readStops() {
  return (Get-Content ./stops.json) -join '' | ConvertFrom-Json | %{ $_ } |
    ForEach-Object -Begin { $h = @{} } { $h.Add($_.id, $_)  } -End { $h }
}

function readTrips() {
  (Get-Content ./trips.json) -join '' | ConvertFrom-Json
}

$dayWeights = readDays
$times = readTimes
$stops = readStops
$trips = readTrips

function weightOfTime($dt) {
  $dt = Get-Date "$($times[0].time.ToString('MM/dd/yyyy')) $($dt.ToString('HH:mm:ss'))"

  return $times | Where-Object { $_.time -le $dt -and $dt -lt $_.time.AddMinutes(15) } | Select-Object -First 1 -ExpandProperty weight
}

$trips |
  ForEach-Object {
    
    # filter the real stops of the trip, and compue the cumulated weights
    $tripStops = $_.stops | 
      ForEach-Object -Begin { $h = @{}; $sw = 0 } `
                     { 
                       $sw = $sw - $stops[$_.id].weightStepOut + $stops[$_.id].weightStepIn; 
                       $h.Add($_.id, (Select-Object -InputObject $stops[$_.id] weightStepIn, weightStepOut, @{ Name='sumWeight'; Expression={ $sw } })) 
                     } `
                     -End { $h }

    # compute the maximum cumulated weight
    $maxWeight = ($tripStops.Values | Measure-Object -Maximum sumWeight).Maximum
    
    # compute the percent weights of the maximum cumulated weight
    $tripStops = $tripStops.Keys | ForEach-Object -Begin { $h = @{} } { $h.Add($_, [PSCustomObject] @{ weightStepIn=$tripStops[$_].weightStepIn / $maxWeight; weightStepOut=$tripStops[$_].weightStepOut / $maxWeight }) } -End { $h }     

    # complete the data
    [PSCustomObject] @{
      date = $_.date;
      stops = $_.stops | ForEach-Object {
        [PSCustomObject] @{ 
          date=$_.date; 
          id=$_.id; 
          stepIn=[Math]::Round($CAPACITY_OF_TRAIN * $tripStops[$_.id].weightStepIn * $dayWeights[$_.date.DayOfWeek] * (weightOfTime $_.date));
          stepOut=[Math]::Round($CAPACITY_OF_TRAIN * $tripStops[$_.id].weightStepOut * $dayWeights[$_.date.DayOfWeek] * (weightOfTime $_.date));
        } 
      }
    }
  } | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 ./completed-trips.json