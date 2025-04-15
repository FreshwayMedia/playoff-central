# Configuration
$baseUrl = "http://localhost:3001"
$headers = @{
    "Content-Type" = "application/json"
}

# Helper function to make HTTP requests with better error handling
function Invoke-APIRequest {
    param (
        [string]$Method,
        [string]$Endpoint,
        [object]$Body,
        [string]$Description
    )

    Write-Host "`n$Description..."
    
    try {
        $fullUrl = "$baseUrl$Endpoint"
        Write-Host "Making $Method request to: $fullUrl"
        
        if ($Body) {
            Write-Host "Request Body:"
            Write-Host ($Body | ConvertTo-Json)
        }

        $response = Invoke-RestMethod `
            -Uri $fullUrl `
            -Method $Method `
            -Headers $headers `
            -Body ($Body | ConvertTo-Json) `
            -ContentType "application/json" `
            -TimeoutSec 30

        Write-Host "Success Response:"
        Write-Host ($response | ConvertTo-Json -Depth 10)
        return $response
    }
    catch {
        Write-Host "Error Response:"
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
        
        try {
            $rawResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($rawResponse)
            $rawResponse.Position = 0
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody"
        }
        catch {
            Write-Host "Could not read error response body: $_"
        }
        
        Write-Host "Full Error Details:"
        Write-Host $_
        return $null
    }
}

# Test registration
$registerBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
}

$registerResponse = Invoke-APIRequest -Method "POST" -Endpoint "/api/auth/register" -Body $registerBody -Description "Testing registration"

# Test login with correct credentials
$loginBody = @{
    email = "test@example.com"
    password = "password123"
}

$loginResponse = Invoke-APIRequest -Method "POST" -Endpoint "/api/auth/login" -Body $loginBody -Description "Testing login with correct credentials"

# Test login with incorrect password
$wrongLoginBody = @{
    email = "test@example.com"
    password = "wrongpassword"
}

$wrongLoginResponse = Invoke-APIRequest -Method "POST" -Endpoint "/api/auth/login" -Body $wrongLoginBody -Description "Testing login with incorrect password" 