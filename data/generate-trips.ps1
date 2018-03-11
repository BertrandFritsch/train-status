
function parseDate($dt) {
  $dateTemplate = 'yyyyMMddTHHmmss'

  return [DateTime]::ParseExact($dt, $dateTemplate, $null)
}

function streamDate($dt) {
  return $dt.toString('yyyyMMddTHHmmss')
}

$date = get-date '08/27/2017 00:00:00'

$(
  for ($i = 0; $i -lt 7; ++$i) {

    $day = $date.AddDays($i)
    Write-Host "Get the trips for $($day.DayOfWeek)"

    $trips = Invoke-RestMethod "https://api.navitia.io/v1/coverage/fr-idf/journeys?from=stop_point:OIF:SP:8738286:800:L&to=stop_point:OIF:SP:8738400:800:L&allowed_id[]=commercial_mode:rapidtransit&max_nb_transfers=0&min_nb_journeys=100&datetime=$(streamDate $day)" -Headers @{ Authorization='500e0590-34d8-45bc-8081-2da6fd3b7755' }

    $trips.journeys | 
      # filter the dates of the day -- exclude the dates of the next day
      Where-Object { (parseDate $_.departure_date_time) -lt $day.AddDays(1) } |

      ForEach-Object {
        [PSCustomObject] @{ 
          date = (parseDate($_.departure_date_time));
          stops = $_.sections.stop_date_times |
            ForEach-Object { 
              [PSCustomObject] @{ 
                date=(parseDate($_.departure_date_time));
                id=$_.stop_point.id;
              } 
            }
        }
      }
  }
) | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 ./trips.json