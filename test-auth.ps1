# Configuration
$baseUrl = "https://web-production-319e7.up.railway.app"
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
            -ContentType "application/json"

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
$registrationBody = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
}

$registrationResponse = Invoke-APIRequest `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body $registrationBody `
    -Description "Testing user registration"

# Test login with correct credentials
if ($registrationResponse) {
    $loginBody = @{
        email = "test@example.com"
        password = "password123"
    }

    $loginResponse = Invoke-APIRequest `
        -Method "POST" `
        -Endpoint "/api/auth/login" `
        -Body $loginBody `
        -Description "Testing user login with correct credentials"

    # Store the token if login was successful
    if ($loginResponse -and $loginResponse.token) {
        $headers["Authorization"] = "Bearer $($loginResponse.token)"
        Write-Host "`nAuthentication token received and stored in headers"
    }
}

# Test login with incorrect password
$invalidLoginBody = @{
    email = "test@example.com"
    password = "wrongpassword"
}

Invoke-APIRequest `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body $invalidLoginBody `
    -Description "Testing login with incorrect password" 